// Single place to swap the Vakil avatar artwork.
//
// Current artwork: "Meera", a front-facing smiling portrait cropped from the character sheet
// (frontend/public/avatar/meera-character-sheet.webp, bottom-middle cell, cropped by Pillow to
// frontend/public/avatar/meera-portrait-front-smiling.png). It is a single still: `kind: "static"`
// means no mouth or blink frame swaps. The talking state is shown only by the CSS speaking indicator
// (.vakil-3d-avatar.is-talking), which VoiceRecorder drives from real SpeechContext playback.
//
// A single still image cannot provide lip-sync or blinking. Pre-rendered talking-head clips (for example,
// from ElevenLabs Avatars) cannot be synchronised to this site's generated audio either, so they are not a
// substitute for lip-sync.
//
// Optional fallback: VAKIL_AVATAR_BLENDER_STILLS holds the earlier Blender-rendered idle/talk/blink stills
// (frontend/public/avatar/, built by avatar/build_avatar.py). To restore them, point VAKIL_AVATAR at it.
// Those stills use `kind: "frames"`, which swaps mouth and blink frames on a timer.
//
// Do not use screenshots of a tool's UI as avatar artwork.

export const VAKIL_AVATAR_MEERA_PORTRAIT = {
  kind: "static",
  label: "Meera, Legal-Setu AI assistant avatar",
  frames: {
    idle: "/avatar/meera-portrait-front-smiling.png",
  },
};

export const VAKIL_AVATAR_BLENDER_STILLS = {
  kind: "frames",
  label: "Legal-Setu AI advocate avatar",
  frames: {
    idle: "/avatar/vakil-idle.png",
    talk: "/avatar/vakil-talk.png",
    blink: "/avatar/vakil-blink.png",
  },
};

export const VAKIL_AVATAR = VAKIL_AVATAR_MEERA_PORTRAIT;
