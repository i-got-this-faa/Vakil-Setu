// App-owned adapter. The unmodified eSpeak NG engine is separately licensed;
// see espeak-ng/COPYING and espeak-ng/NOTICE.md.
import initialize from "./espeak-ng/espeak-ng.js";

const SAMPLE_RATE = 22050;
const MAX_SAMPLES = SAMPLE_RATE * 60 * 5;

self.onmessage = async ({ data }) => {
  if (
    !data ||
    (data.locale !== "hi" && data.locale !== "pa") ||
    typeof data.text !== "string" ||
    !data.text.trim() ||
    data.text.length > 10000
  ) {
    self.postMessage({ kind: "error" });
    return;
  }
  let audioLimitExceeded = false;
  try {
    const module = await initialize();
    const engine = new module.eSpeakNGWorker();
    if (engine.get_samplerate() !== SAMPLE_RATE) throw new Error("Unexpected sample rate");
    const voice = engine.list_voices().find((entry) =>
      entry.languages.some((language) => language.name === data.locale));
    if (!voice || engine.set_voice(voice.name) !== 0) throw new Error("Voice unavailable");
    // eSpeak uses integer words per minute, not Web Speech's relative rate.
    engine.set_rate(175);
    const chunks = [];
    let length = 0;
    // eSpeak accepts SSML; user text must remain literal text.
    const text = data.text.replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
    })[char]);
    engine.synthesize(text, (samples) => {
      if (!samples?.length) return;
      length += samples.length;
      if (length > MAX_SAMPLES) {
        audioLimitExceeded = true;
        throw new Error("Audio limit exceeded");
      }
      // The engine reuses its heap between callbacks.
      chunks.push(Int16Array.from(samples));
    });
    if (!length) throw new Error("No audio generated");
    const audio = new Float32Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      for (const sample of chunk) audio[offset++] = sample / 32768;
    }
    self.postMessage({ kind: "audio", sampleRate: SAMPLE_RATE, samples: audio }, [audio.buffer]);
  } catch {
    // Never send transcripts or engine diagnostics into UI/logging channels.
    self.postMessage({ kind: "error", reason: audioLimitExceeded ? "audio_limit" : "synthesis_failed" });
  }
};
