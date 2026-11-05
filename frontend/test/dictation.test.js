import test from "node:test";
import assert from "node:assert/strict";
import { createDictation } from "../src/utils/dictation.js";

test("dictation preserves drafts, replaces hypotheses and waits for final results after stop", () => {
  let recognizer, draft, state, playbackCancelled = false;
  class Recognition {
    constructor() { recognizer = this; }
    start() {} stop() {} abort() {}
  }
  const session = createDictation({ Recognition, language: "hi-IN", draft: "Typed introduction.",
    onText: t => { draft = t; }, onState: s => { state = s; }, onError() {}, cancelPlayback: () => { playbackCancelled = true; } });
  session.start(); assert.equal(playbackCancelled, true); assert.equal(recognizer.lang, "hi-IN");
  const result = (text, isFinal) => Object.assign([{ transcript: text }], { isFinal });
  recognizer.onresult({ results: [result("wrong guess", false)] });
  recognizer.onresult({ results: [result("correct words", false)] });
  assert.equal(draft, "Typed introduction. correct words");
  session.stop(); assert.equal(state, "stopping");
  recognizer.onresult({ results: [result("correct final words", true)] });
  recognizer.onend(); assert.equal(state, "idle");
  assert.equal(draft, "Typed introduction. correct final words");
  recognizer.onresult({ results: [result("late event", true)] });
  assert.equal(draft, "Typed introduction. correct final words");
});

test("disposed recognizers cannot overwrite a new draft", () => {
  let recognizer, updates = 0;
  class Recognition { constructor() { recognizer = this; } start() {} abort() { this.onend(); } }
  const session = createDictation({ Recognition, language: "en-IN", draft: "", onText: () => updates++, onState() {}, onError() {} });
  session.start(); session.dispose();
  recognizer.onresult({ results: [] }); assert.equal(updates, 0);
});
