import { useEffect, useState } from "react";
import { VAKIL_AVATAR } from "../config/avatarAssets";

// Artwork and mode are configured in config/avatarAssets.js.
// kind "static": one still image. No mouth or blink timers run, because a single still cannot show
// either. The talking prop only toggles .is-talking, which drives the CSS speaking indicator.
// kind "frames": optional Blender stills with timed mouth and blink swaps (cosmetic, not lip-sync).
const { kind, label, frames: FRAMES } = VAKIL_AVATAR;
const STATIC = kind === "static";

export default function VakilAvatar({ talking = false }) {
  const [mouthOpen, setMouthOpen] = useState(false);
  const [blinking, setBlinking] = useState(false);

  useEffect(() => {
    Object.values(FRAMES).forEach((src) => {
      new Image().src = src;
    });
  }, []);

  useEffect(() => {
    if (STATIC || !talking) {
      setMouthOpen(false);
      return undefined;
    }
    const id = setInterval(() => setMouthOpen((open) => !open), 180);
    return () => clearInterval(id);
  }, [talking]);

  useEffect(() => {
    if (STATIC) return undefined;
    let blinkTimer;
    let openTimer;
    const schedule = () => {
      blinkTimer = setTimeout(() => {
        setBlinking(true);
        openTimer = setTimeout(() => {
          setBlinking(false);
          schedule();
        }, 140);
      }, 2500 + Math.random() * 2500);
    };
    schedule();
    return () => {
      clearTimeout(blinkTimer);
      clearTimeout(openTimer);
    };
  }, []);

  const frame = STATIC ? FRAMES.idle : mouthOpen ? FRAMES.talk : blinking ? FRAMES.blink : FRAMES.idle;
  const classes = ["vakil-3d-avatar", STATIC && "is-static", talking && "is-talking"].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      <img src={frame} alt={label} draggable="false" />
    </div>
  );
}
