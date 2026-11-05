import { useEffect, useState } from "react";

// Frames are rendered by avatar/build_avatar.py (Blender) into public/avatar/.
const FRAMES = {
  idle: "/avatar/vakil-idle.png",
  talk: "/avatar/vakil-talk.png",
  blink: "/avatar/vakil-blink.png"
};

export default function VakilAvatar({ talking = false }) {
  const [mouthOpen, setMouthOpen] = useState(false);
  const [blinking, setBlinking] = useState(false);

  useEffect(() => {
    Object.values(FRAMES).forEach((src) => {
      new Image().src = src;
    });
  }, []);

  useEffect(() => {
    if (!talking) {
      setMouthOpen(false);
      return undefined;
    }
    const id = setInterval(() => setMouthOpen((open) => !open), 180);
    return () => clearInterval(id);
  }, [talking]);

  useEffect(() => {
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

  const frame = mouthOpen ? FRAMES.talk : blinking ? FRAMES.blink : FRAMES.idle;

  return (
    <div className={`vakil-3d-avatar ${talking ? "is-talking" : ""}`}>
      <img src={frame} alt="Vakil AI advocate avatar" draggable="false" />
    </div>
  );
}
