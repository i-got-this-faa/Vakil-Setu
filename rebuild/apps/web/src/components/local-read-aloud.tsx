"use client";

import { Button } from "@vakil/ui";
import { Volume2 } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useLocale } from "./locale";

type Session = {
  worker: Worker;
  context: AudioContext;
  source: AudioBufferSourceNode | null;
  timeout: ReturnType<typeof setTimeout> | null;
};

export function LocalReadAloud({ text, locale }: { text: string; locale: "hi" | "pa" }) {
  const { copy } = useLocale();
  const statusId = useId();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [playback, setPlayback] = useState<
    "idle" | "starting" | "speaking" | "finished" | "stopped" | "error" | "blocked" | "limit"
  >("idle");
  const active = useRef<Session | null>(null);
  const cancel = useCallback(() => {
    const session = active.current;
    active.current = null;
    if (!session) return;
    session.worker.terminate();
    if (session.timeout !== null) clearTimeout(session.timeout);
    if (session.source) {
      session.source.onended = null;
      session.source.stop();
      session.source.disconnect();
    }
    void session.context.close().catch(() => undefined);
  }, []);
  useEffect(() => {
    setAvailable("AudioContext" in window && "Worker" in window && "WebAssembly" in window);
  }, []);
  useEffect(() => {
    cancel();
    setPlayback("idle");
    return cancel;
  }, [text, locale, cancel]);

  async function speak() {
    if (!available || !text.trim() || active.current) return;
    setPlayback("starting");
    let context: AudioContext;
    try {
      context = new AudioContext();
    } catch {
      setPlayback("error");
      return;
    }
    let worker: Worker;
    try {
      worker = new Worker("/speech/local-worker.js", { type: "module" });
    } catch {
      void context.close().catch(() => undefined);
      setPlayback("error");
      return;
    }
    const session: Session = { worker, context, source: null, timeout: null };
    active.current = session;
    const fail = (state: "error" | "blocked" | "limit" = "error") => {
      if (active.current !== session) return;
      cancel();
      setPlayback(state);
    };
    session.timeout = setTimeout(() => fail(), 60000);
    worker.onerror = () => fail();
    worker.onmessageerror = () => fail();
    worker.onmessage = (event: MessageEvent<unknown>) => {
      if (active.current !== session || session.source !== null) return;
      const data = event.data;
      if (typeof data === "object" && data !== null && "kind" in data &&
        data.kind === "error" && "reason" in data && data.reason === "audio_limit") {
        fail("limit");
        return;
      }
      if (
        typeof data !== "object" || data === null ||
        !("kind" in data) || data.kind !== "audio" ||
        !("sampleRate" in data) || data.sampleRate !== 22050 ||
        !("samples" in data) || !(data.samples instanceof Float32Array) ||
        !data.samples.length || data.samples.length > 22050 * 60 * 5
      ) {
        fail();
        return;
      }
      try {
        if (context.state !== "running") {
          fail("blocked");
          return;
        }
        const buffer = context.createBuffer(1, data.samples.length, data.sampleRate);
        buffer.getChannelData(0).set(data.samples);
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        source.onended = () => {
          if (active.current !== session) return;
          cancel();
          setPlayback("finished");
        };
        source.start();
        session.source = source;
        if (session.timeout !== null) clearTimeout(session.timeout);
        session.timeout = null;
        worker.terminate();
        setPlayback("speaking");
      } catch {
        fail();
      }
    };
    try {
      // Resume during the button gesture, before loading/synthesizing the voice.
      await context.resume();
      if (active.current !== session) return;
      if (context.state !== "running") {
        fail("blocked");
        return;
      }
      worker.postMessage({ text: text.trim(), locale });
    } catch {
      fail("blocked");
    }
  }

  const busy = playback === "starting" || playback === "speaking";
  const status = available === null ? copy.readAloud.checking
    : !available ? copy.readAloud.unavailable
      : !text.trim() ? copy.readAloud.empty
        : playback === "idle" ? copy.readAloud.bundledReady
          : playback === "starting" ? copy.readAloud.bundledStarting
            : playback === "error" ? copy.readAloud.bundledError
              : playback === "limit" ? copy.readAloud.bundledLimit
            : copy.readAloud[playback];
  return (
    <div>
      <p id={statusId} role="status" className="muted small-text">{status}</p>
      <div className="actions" style={{ marginTop: 10 }}>
        <Button type="button" className="btn secondary small"
          disabled={!available || !text.trim() || busy} aria-describedby={statusId}
          onClick={() => void speak()}>
          <Volume2 size={15} />{copy.readAloud.label}
        </Button>
        <Button type="button" className="btn secondary small" disabled={!busy}
          onClick={() => { cancel(); setPlayback("stopped"); }}>
          {copy.readAloud.stop}
        </Button>
      </div>
      <p className="muted small-text" style={{ marginTop: 8 }}>
        {copy.readAloud.bundledDisclosure}{" "}
        <a href="/speech/espeak-ng/NOTICE.md" target="_blank" rel="noreferrer">eSpeak NG · GPL-3.0</a>
      </p>
    </div>
  );
}
