import React from "react";
import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { createSpeechPlayback, speechReasonMessage } from "../services/speechPlayback";

const shared = vi.hoisted(() => ({ services: null, capabilities: { data: undefined }, speech: null }));
vi.mock("../state/ConvexServices", () => ({
  useServices: () => shared.services,
  useServiceQuery: () => shared.capabilities,
}));
vi.mock("../state/SpeechContext", async () => {
  const actual = await vi.importActual("../state/SpeechContext");
  // Component tests inject a stub; the provider test (no stub) uses the real context hook.
  return { ...actual, useSpeech: () => shared.speech || actual.useSpeech() };
});
import ReplySpeech from "../components/ReplySpeech";
import { SpeechProvider, useSpeech } from "../state/SpeechContext";

afterEach(() => { cleanup(); shared.speech = null; });

function fakeAudio() {
  const listeners = new Map();
  return {
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn(),
    addEventListener: (name, fn) => { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(fn); },
    removeEventListener: (name, fn) => { listeners.get(name)?.delete(fn); },
    emit: name => { for (const fn of [...(listeners.get(name) || [])]) fn(); },
    listenerCount: () => [...listeners.values()].reduce((n, set) => n + set.size, 0),
  };
}

function harness(overrides = {}) {
  const audios = [];
  const urls = [];
  const revoked = [];
  let counter = 0;
  const deps = {
    synthesize: vi.fn(async () => ({ kind: "audio", audio: new ArrayBuffer(4), mimeType: "audio/mpeg" })),
    speakOnDevice: vi.fn(() => ({ cancel: vi.fn() })),
    createAudio: vi.fn(() => { const audio = fakeAudio(); audios.push(audio); return audio; }),
    createAudioUrl: vi.fn(() => { const url = `blob:test/${++counter}`; urls.push(url); return url; }),
    revokeAudioUrl: vi.fn(url => { revoked.push(url); }),
    onChange: vi.fn(),
    ...overrides,
  };
  return { controller: createSpeechPlayback(deps), deps, audios, urls, revoked };
}

const reply = (turnId = "turn-1") => ({ id: `${turnId}-reply`, turnId, text: "Prepare documents and consult an advocate.", locale: "en-IN" });
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

test("play() alone never reports playing; only the audio element's playing event does, and ended returns to idle", async () => {
  const h = harness();
  const pending = h.controller.play({ ...reply(), provider: "elevenlabs" });
  expect(h.controller.getState()).toMatchObject({ status: "loading", id: "turn-1-reply" });
  await pending;
  expect(h.audios[0].play).toHaveBeenCalledTimes(1);
  expect(h.controller.getState().status).toBe("loading");
  act(() => {});
  h.audios[0].emit("playing");
  expect(h.controller.getState()).toMatchObject({ status: "playing", provider: "elevenlabs", errorId: null });
  h.audios[0].emit("ended");
  expect(h.controller.getState()).toMatchObject({ status: "idle", id: null, provider: null, cached: ["turn-1"] });
  expect(h.audios[0].listenerCount()).toBe(0);
});

test("a second press on the same reply while it loads is ignored, so no second billable request starts", async () => {
  const h = harness();
  await Promise.all([h.controller.play({ ...reply(), provider: "elevenlabs" }), h.controller.play({ ...reply(), provider: "elevenlabs" })]);
  expect(h.deps.synthesize).toHaveBeenCalledTimes(1);
  expect(h.deps.synthesize).toHaveBeenCalledWith({ turnId: "turn-1" });
});

test("replay uses the cached audio and never calls the server again", async () => {
  const h = harness();
  await h.controller.play({ ...reply(), provider: "elevenlabs" });
  h.audios[0].emit("playing"); h.audios[0].emit("ended");
  await h.controller.play({ ...reply(), provider: "elevenlabs" });
  expect(h.deps.synthesize).toHaveBeenCalledTimes(1);
  expect(h.deps.createAudio).toHaveBeenCalledTimes(2);
  expect(h.deps.createAudio.mock.calls[1][0]).toBe(h.urls[0]);
});

test("stopping while the request is in flight keeps the paid audio cached and never starts it late", async () => {
  let resolveSynth;
  const h = harness({ synthesize: vi.fn(() => new Promise(resolve => { resolveSynth = resolve; })) });
  const first = h.controller.play({ ...reply(), provider: "elevenlabs" });
  h.controller.stop();
  resolveSynth({ kind: "audio", audio: new ArrayBuffer(4), mimeType: "audio/mpeg" });
  await first;
  expect(h.deps.createAudio).not.toHaveBeenCalled();
  expect(h.controller.getState()).toMatchObject({ status: "idle", id: null, cached: ["turn-1"] });
  await h.controller.play({ ...reply(), provider: "elevenlabs" });
  expect(h.deps.synthesize).toHaveBeenCalledTimes(1);
  expect(h.deps.createAudio).toHaveBeenCalledTimes(1);
});

test("an audio element error shows a message on that reply, revokes its URL and forgets the cache so a retry asks the server again", async () => {
  const h = harness();
  await h.controller.play({ ...reply(), provider: "elevenlabs" });
  h.audios[0].emit("error");
  expect(h.controller.getState()).toMatchObject({ status: "idle", errorId: "turn-1-reply", cached: [] });
  expect(h.controller.getState().error).toMatch(/could not be played/);
  expect(h.revoked).toEqual([h.urls[0]]);
  await h.controller.play({ ...reply(), provider: "elevenlabs" });
  expect(h.deps.synthesize).toHaveBeenCalledTimes(2);
});

test("a browser that blocks play() gets an honest press-again message and never shows playing", async () => {
  const h = harness({ createAudio: vi.fn(() => ({ ...fakeAudio(), play: vi.fn(() => Promise.reject(new DOMException("blocked", "NotAllowedError"))) })) });
  await h.controller.play({ ...reply(), provider: "elevenlabs" });
  await flush();
  expect(h.controller.getState()).toMatchObject({ status: "idle", id: null, errorId: "turn-1-reply" });
  expect(h.controller.getState().error).toMatch(/Press the button again/);
});

test("server refusals map to fixed, honest messages without playing or silently switching providers", async () => {
  const h = harness({ synthesize: vi.fn(async () => ({ kind: "unavailable", reason: "unsupported_language" })) });
  await h.controller.play({ ...reply(), provider: "elevenlabs" });
  expect(h.deps.createAudio).not.toHaveBeenCalled();
  expect(h.deps.speakOnDevice).not.toHaveBeenCalled();
  expect(h.controller.getState()).toMatchObject({ status: "idle", errorId: "turn-1-reply", error: speechReasonMessage("unsupported_language") });
  expect(h.controller.getState().error).toMatch(/Use the device voice/);
});

test("a thrown network or convex error becomes a provider failure message", async () => {
  const h = harness({ synthesize: vi.fn(async () => { throw new Error("socket closed"); }) });
  await h.controller.play({ ...reply(), provider: "elevenlabs" });
  expect(h.controller.getState()).toMatchObject({ status: "idle", errorId: "turn-1-reply", error: speechReasonMessage("provider_failed") });
});

test("reset during in-flight synthesis discards the result, revokes every cached URL and stops playing audio", async () => {
  let resolveSecond;
  const synthesize = vi.fn()
    .mockResolvedValueOnce({ kind: "audio", audio: new ArrayBuffer(4), mimeType: "audio/mpeg" })
    .mockImplementationOnce(() => new Promise(resolve => { resolveSecond = resolve; }));
  const h = harness({ synthesize });
  await h.controller.play({ ...reply("turn-1"), provider: "elevenlabs" });
  h.audios[0].emit("playing");
  const pending = h.controller.play({ ...reply("turn-2"), provider: "elevenlabs" });
  h.controller.reset();
  resolveSecond({ kind: "audio", audio: new ArrayBuffer(4), mimeType: "audio/mpeg" });
  await pending;
  expect(h.deps.createAudio).toHaveBeenCalledTimes(1);
  expect(h.deps.createAudioUrl).toHaveBeenCalledTimes(1);
  expect(h.audios[0].pause).toHaveBeenCalled();
  expect(h.revoked).toEqual([h.urls[0]]);
  expect(h.controller.getState()).toMatchObject({ status: "idle", id: null, cached: [] });
  expect(h.controller.hasAudio("turn-1")).toBe(false);
});

test("the cache is bounded, revokes least-recent URLs, and never revokes audio that is currently playing", async () => {
  const h = harness({ maxCached: 1 });
  await h.controller.play({ ...reply("turn-1"), provider: "elevenlabs" });
  await h.controller.play({ ...reply("turn-2"), provider: "elevenlabs" });
  expect(h.revoked).toEqual([h.urls[0]]);
  expect(h.controller.hasAudio("turn-2")).toBe(true);

  // turn-2 is cached; start turn-3 (pending), then replay turn-2 so it is the active playback when turn-3 lands.
  let resolveThird;
  h.deps.synthesize.mockImplementationOnce(() => new Promise(resolve => { resolveThird = resolve; }));
  const pendingThird = h.controller.play({ ...reply("turn-3"), provider: "elevenlabs" });
  await h.controller.play({ ...reply("turn-2"), provider: "elevenlabs" });
  resolveThird({ kind: "audio", audio: new ArrayBuffer(4), mimeType: "audio/mpeg" });
  await pendingThird;
  expect(h.revoked).not.toContain(h.urls[1]);
  expect(h.controller.getState()).toMatchObject({ status: "loading", id: "turn-2-reply" });
});

test("device voice reports playing only after the device starts, and stop cancels it", async () => {
  const h = harness();
  const cancel = vi.fn();
  h.deps.speakOnDevice.mockImplementationOnce(() => ({ cancel }));
  const pending = h.controller.play({ ...reply(), provider: "device" });
  expect(h.controller.getState()).toMatchObject({ status: "loading", provider: "device" });
  await pending;
  const handlers = h.deps.speakOnDevice.mock.calls[0][2];
  expect(h.deps.speakOnDevice.mock.calls[0][0]).toBe("Prepare documents and consult an advocate.");
  act(() => {});
  handlers.onStart();
  expect(h.controller.getState()).toMatchObject({ status: "playing", provider: "device" });
  h.controller.stop();
  expect(cancel).toHaveBeenCalledTimes(1);
  expect(h.deps.synthesize).not.toHaveBeenCalled();
  expect(h.controller.getState().status).toBe("idle");
});

test("when the device voice is unsupported the controller says so instead of calling a server", async () => {
  const h = harness({ speakOnDevice: vi.fn(() => null) });
  await h.controller.play({ ...reply(), provider: "device" });
  expect(h.deps.synthesize).not.toHaveBeenCalled();
  expect(h.controller.getState()).toMatchObject({ status: "idle", errorId: "turn-1-reply", error: "Device voice is not available in this browser." });
});

test("a late ended event after stop does not change state", async () => {
  const h = harness();
  await h.controller.play({ ...reply(), provider: "elevenlabs" });
  h.audios[0].emit("playing");
  h.controller.stop();
  expect(h.audios[0].pause).toHaveBeenCalledTimes(1);
  const before = h.deps.onChange.mock.calls.length;
  h.audios[0].emit("ended");
  expect(h.deps.onChange.mock.calls.length).toBe(before);
});

test("reply error messages are fixed text for every reason, including Punjabi and rate limits", () => {
  for (const reason of ["not_configured", "unsupported_language", "consent_required", "rate_limited", "in_progress", "timeout", "response_too_large"]) {
    expect(speechReasonMessage(reason).length).toBeGreaterThan(10);
  }
  expect(speechReasonMessage("made_up")).toBe(speechReasonMessage("provider_failed"));
});

function speechStub(overrides = {}) {
  return {
    playback: { status: "idle", id: null, provider: null, error: "", errorId: null, cached: [] },
    consent: false,
    setConsent: vi.fn(),
    naturalVoice: { loaded: true, configured: true, languages: ["en", "hi"], reason: "" },
    naturalSupportsLocale: locale => ["en", "hi"].includes(locale),
    deviceSupported: true,
    speak: vi.fn(),
    stop: vi.fn(),
    ...overrides,
  };
}

test("reply controls name the provider, gate natural voice on consent, and hide it for Punjabi", () => {
  shared.speech = speechStub();
  const message = { id: "turn-1-reply", turnId: "turn-1", content: "Reply.", language: "en" };
  const { unmount } = render(<ReplySpeech message={message} />);
  expect(screen.getByRole("button", { name: "Play this reply with the device voice in this browser" }).disabled).toBe(false);
  const natural = screen.getByRole("button", { name: "Play this reply with natural voice from ElevenLabs" });
  expect(natural.disabled).toBe(true);
  expect(screen.getByText(/Turn on natural voice above/)).toBeTruthy();
  unmount();

  shared.speech = speechStub({ consent: true });
  render(<ReplySpeech message={message} />);
  fireEvent.click(screen.getByRole("button", { name: "Play this reply with natural voice from ElevenLabs" }));
  expect(shared.speech.speak).toHaveBeenCalledWith(expect.objectContaining({ turnId: "turn-1", text: "Reply." }), "elevenlabs");
  cleanup();

  shared.speech = speechStub({ consent: true });
  render(<ReplySpeech message={{ ...message, language: "pa", turnId: "turn-9" }} />);
  expect(screen.queryByRole("button", { name: /natural voice/i })).toBeNull();
  expect(screen.getByText(/not available for Punjabi/)).toBeTruthy();
});

test("while audio for a reply is playing, its Stop control is labelled and the status is announced", () => {
  shared.speech = speechStub({ playback: { status: "playing", id: "turn-1-reply", provider: "device", error: "", errorId: null, cached: [] } });
  render(<ReplySpeech message={{ id: "turn-1-reply", turnId: "turn-1", content: "Reply.", language: "en" }} />);
  fireEvent.click(screen.getByRole("button", { name: "Stop reply audio" }));
  expect(shared.speech.stop).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("status").textContent).toMatch(/device voice/);
});

test("consent resets when the active case changes, so a stale opt-in cannot carry into another case", async () => {
  shared.services = { status: "ready", client: { action: vi.fn() }, userId: "alice" };
  shared.capabilities = { data: { configured: true, languages: ["en", "hi"] } };
  let speech = null;
  function Probe() { speech = useSpeech(); return <p>{speech.consent ? "consented" : "not consented"}</p>; }
  const view = caseId => <MemoryRouter><SpeechProvider activeCaseId={caseId}><Probe /></SpeechProvider></MemoryRouter>;
  const ui = render(view("case-a"));
  await act(async () => { speech.setConsent(true); });
  expect(screen.getByText("consented")).toBeTruthy();
  ui.rerender(view("case-b"));
  await act(async () => {});
  expect(screen.getByText("not consented")).toBeTruthy();
});

test("a route change stops audio that is playing, so it never plays over another page", async () => {
  const cancel = vi.fn();
  const speak = vi.fn();
  vi.stubGlobal("speechSynthesis", { getVoices: () => [], cancel, resume: () => {}, speak });
  vi.stubGlobal("SpeechSynthesisUtterance", class { constructor(text) { this.text = text; } });
  shared.services = { status: "ready", client: null, userId: "alice" };
  shared.capabilities = { data: undefined };
  let speech = null;
  function Probe() { speech = useSpeech(); return <p>{speech.playback.status}</p>; }
  function Navigate() { const navigate = useNavigate(); return <button type="button" onClick={() => navigate("/elsewhere")}>leave</button>; }
  render(<MemoryRouter initialEntries={["/chat"]}><SpeechProvider activeCaseId={null}><Probe /><Navigate /></SpeechProvider></MemoryRouter>);
  act(() => { speech.speak({ id: "r-reply", turnId: "r", text: "Hello reply", locale: "en-IN" }, "device"); });
  const utterance = speak.mock.calls[0][0];
  act(() => { utterance.onstart(); });
  expect(screen.getByText("playing")).toBeTruthy();
  fireEvent.click(screen.getByText("leave"));
  expect(screen.getByText("idle")).toBeTruthy();
  expect(cancel).toHaveBeenCalled();
  vi.unstubAllGlobals();
});
