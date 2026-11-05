# Bundled eSpeak NG voice engine

The unmodified `espeak-ng.js` and `espeak-ng.data` files are from the Echogarden project's eSpeak NG Emscripten port, package metadata version 0.4.1.

Artifact repository and inspected revision:
https://github.com/echogarden-project/espeak-ng-emscripten/tree/7ab07eba2d966ce45040c88d9be953e1d68640e7

These files were compared byte for byte against that checkout on 15 October 2026. SHA-256:

- `espeak-ng.js`: `ba2b5f80f00a782a467c2072df2afe277124e328083ef6fb1aeed7d40205342a`
- `espeak-ng.data`: `34d8d90d112acd35f6b7cdf3da16125444aeeebc4b68bee87cd55d6f7e4dd3a0`

The engine is licensed under GPL-3.0. The full upstream license is provided as `COPYING`. `UPSTREAM.md` preserves its build instructions and attribution. Engine source and build tooling are maintained in the source fork linked there:
https://github.com/echogarden-project/espeak-ng/tree/fork

The source fork's head inspected on that date was `9a550bef455f03b459f51796e3482833aab7fbc0`. That observation does not establish which source revision or Emscripten toolchain produced the upstream artifacts. Confirm corresponding source/build provenance and redistribution obligations before publishing these engine files; public deployment is outside the current local build scope.

The application adapter is `../local-worker.js`; the upstream engine files are not modified. Voice data is approximately 19 MB and loads from this application on first use. Synthesis runs in a browser worker and audio is played through Web Audio. The adapter does not send the text to an external speech service. No pronunciation, comprehension or legal accuracy claim is made.
