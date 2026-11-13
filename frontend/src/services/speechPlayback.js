// Pure playback controller for persisted assistant replies. No React, no browser globals: all effects are injected,
// so the lifecycle is testable. "Playing" is reported only when the audio element reports it (never assumed on play()).

export const SPEECH_REASON_TEXT = {
  not_configured: "Natural voice is not set up on this server. Use the device voice.",
  invalid_config: "Natural voice is misconfigured on this server. Use the device voice.",
  unsupported_language: "Natural voice does not support this conversation language. Use the device voice.",
  no_reply: "This reply is not ready for audio yet.",
  consent_required: "Allow natural voice above to send this reply to ElevenLabs, or use the device voice.",
  not_ready: "Sign in to use natural voice.",
  rate_limited: "Natural voice limit reached for this hour. Use the device voice or try again later.",
  in_progress: "Audio for this reply is already being prepared. Wait a moment.",
  timeout: "Natural voice took too long. Try again or use the device voice.",
  provider_failed: "Natural voice is unavailable right now. Try again or use the device voice.",
  response_too_large: "This reply is too long for natural voice audio. Use the device voice.",
  malformed: "Natural voice returned unusable audio. Try again.",
};

export function speechReasonMessage(reason) {
  return SPEECH_REASON_TEXT[reason] || SPEECH_REASON_TEXT.provider_failed;
}

const IDLE = Object.freeze({ status: "idle", id: null, provider: null, error: "", errorId: null, cached: [] });

/**
 * @param {object} deps
 * @param {(args: {turnId: string}) => Promise<{kind: "audio", audio: ArrayBuffer, mimeType: string} | {kind: "unavailable", reason: string}>} deps.synthesize
 * @param {(text: string, locale: string, handlers: object) => ({cancel: () => void} | null)} deps.speakOnDevice
 * @param {(url: string) => {play: () => Promise<void> | void, pause: () => void, addEventListener: Function, removeEventListener: Function}} deps.createAudio
 * @param {(bytes: ArrayBuffer, mimeType: string) => string} deps.createAudioUrl
 * @param {(url: string) => void} deps.revokeAudioUrl
 */
export function createSpeechPlayback({ synthesize, speakOnDevice, createAudio, createAudioUrl, revokeAudioUrl, maxCached = 10, onChange = () => {} }) {
  let state = IDLE;
  let token = 0; // bumped by stop(): invalidates the active playback
  let epoch = 0; // bumped by reset(): invalidates everything, including in-flight synthesis
  let active = null; // { id, turnId, provider, stop(), attached }
  const cache = new Map(); // turnId -> object URL of already-paid-for audio, least recently used first

  function publish(patch) {
    state = { ...state, ...patch, cached: [...cache.keys()] };
    onChange(state);
  }

  // Errors keep the failing reply's id (errorId) so only that reply shows the message.
  function settle(handle, patch) {
    if (!handle.attached) return;
    handle.attached = false;
    handle.detach?.();
    if (active === handle) active = null;
    publish({ status: "idle", id: null, provider: null, error: "", errorId: patch.error ? handle.id : null, ...patch });
  }

  function evictOverflow() {
    for (const [turnId, url] of cache) {
      if (cache.size <= maxCached) break;
      if (active && active.turnId === turnId) continue; // never revoke audio that is playing
      cache.delete(turnId);
      revokeAudioUrl(url);
    }
  }

  function remember(turnId, url) {
    const previous = cache.get(turnId);
    if (previous) revokeAudioUrl(previous);
    cache.delete(turnId);
    cache.set(turnId, url);
    evictOverflow();
    publish({});
  }

  function forget(turnId) {
    const url = cache.get(turnId);
    if (!url) return;
    cache.delete(turnId);
    revokeAudioUrl(url);
    publish({});
  }

  function startAudio(id, turnId, url) {
    const audio = createAudio(url);
    const handle = { id, turnId, provider: "elevenlabs", attached: true, stop: null };
    const onPlaying = () => { if (handle.attached) publish({ status: "playing", id, provider: "elevenlabs", error: "" }); };
    const onEnded = () => settle(handle, {});
    const onPause = () => settle(handle, {});
    const onError = () => { forget(turnId); settle(handle, { error: "Natural voice audio could not be played. Try again." }); };
    const detach = () => {
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("error", onError);
    };
    handle.detach = detach;
    handle.stop = () => {
      if (!handle.attached) return;
      handle.attached = false;
      detach();
      audio.pause();
    };
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("error", onError);
    active = handle;
    const started = audio.play();
    if (started && typeof started.catch === "function") {
      started.catch(() => {
        // Autoplay policy or a stale load. Playback only starts on an explicit press, so tell the user to press again.
        if (handle.attached) {
          handle.attached = false;
          detach();
          if (active === handle) active = null;
          publish({ status: "idle", id: null, provider: null, error: "Your browser blocked audio playback. Press the button again to play.", errorId: id });
        }
      });
    }
  }

  function playDevice(id, text, locale) {
    const handle = { id, turnId: null, provider: "device", attached: true, stop: null };
    active = handle;
    publish({ status: "loading", id, provider: "device", error: "" });
    const deviceHandle = speakOnDevice(text, locale, {
      onStart: () => { if (handle.attached) publish({ status: "playing", id, provider: "device", error: "" }); },
      onEnd: () => settle(handle, {}),
      onError: message => settle(handle, { error: message }),
    });
    if (!deviceHandle) {
      handle.attached = false;
      if (active === handle) active = null;
      publish({ status: "idle", id: null, provider: null, error: "Device voice is not available in this browser.", errorId: id });
      return;
    }
    handle.stop = () => {
      if (!handle.attached) return;
      handle.attached = false;
      deviceHandle.cancel();
    };
  }

  /** Stops whatever is active. Any pending natural-voice request is kept only as a cached result. */
  function stop() {
    token += 1;
    const current = active;
    active = null;
    current?.stop?.();
    publish({ status: "idle", id: null, provider: null, error: "" });
  }

  /**
   * Plays one reply. provider: "elevenlabs" (server synthesis, billed, cached per turn) or "device" (no server call).
   * Pressing the same reply again while it is loading is ignored, so double clicks never start a second billable call.
   */
  async function play({ id, turnId, provider, text, locale }) {
    if ((state.status === "loading" || state.status === "playing") && state.id === id) return;
    stop();
    const myToken = token;
    const myEpoch = epoch;
    if (provider === "device") {
      playDevice(id, text, locale);
      return;
    }
    if (provider !== "elevenlabs") return;

    const cachedUrl = cache.get(turnId);
    if (cachedUrl) {
      // Replay: no server call. Refresh recency so the cache keeps what the user listens to.
      cache.delete(turnId);
      cache.set(turnId, cachedUrl);
      publish({ status: "loading", id, provider: "elevenlabs", error: "" });
      startAudio(id, turnId, cachedUrl);
      return;
    }

    publish({ status: "loading", id, provider: "elevenlabs", error: "" });
    let result;
    try {
      result = await synthesize({ turnId });
    } catch {
      if (epoch === myEpoch && token === myToken) publish({ status: "idle", id: null, provider: null, error: speechReasonMessage("provider_failed"), errorId: id });
      return;
    }
    if (epoch !== myEpoch) return; // scope changed while waiting: discard the result entirely
    if (!result || result.kind !== "audio") {
      if (token === myToken) publish({ status: "idle", id: null, provider: null, error: speechReasonMessage(result?.reason), errorId: id });
      return;
    }
    const url = createAudioUrl(result.audio, result.mimeType);
    remember(turnId, url);
    if (token !== myToken) return; // stopped while waiting: keep the paid audio cached for a later replay
    publish({ status: "loading", id, provider: "elevenlabs", error: "" });
    startAudio(id, turnId, url);
  }

  /** Clears playback, revokes every cached object URL and invalidates in-flight synthesis (user, case or route change). */
  function reset() {
    epoch += 1;
    stop();
    for (const url of cache.values()) revokeAudioUrl(url);
    cache.clear();
    publish({});
  }

  return {
    getState: () => state,
    play,
    stop,
    reset,
    dispose: reset,
    hasAudio: turnId => cache.has(turnId),
  };
}
