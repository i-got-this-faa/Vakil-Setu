import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import { voice } from "./ui";

export type AvatarMood = "idle" | "listening" | "thinking" | "speaking";

const SKIN = "#c98d5f";
const SKIN_SHADE = "#b0764b";
const HAIR = "#2b2118";
const COAT = "#1f2937";
const INK = "#1c1917";
const DESIGN = 160;

/**
 * A free, on-device talking advocate. It is drawn from plain views (no native modules, runs in Expo Go)
 * and animated from the phone's own speech engine: the mouth moves while a reply is read aloud and
 * snaps shut between words when the engine reports word boundaries.
 */
export function Avatar({ mood, size = 140, onWord, onPress, label }: {
  mood: AvatarMood;
  size?: number;
  /** Subscribe to spoken word boundaries; returns an unsubscribe function. */
  onWord?: (listener: () => void) => () => void;
  onPress?: () => void;
  label?: string;
}) {
  const u = (n: number) => (n * size) / DESIGN;
  const reduced = useReducedMotion();

  const mouth = useRef(new Animated.Value(0)).current;
  const blink = useRef(new Animated.Value(1)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const gaze = useRef(new Animated.Value(0)).current;
  const brows = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;

  // Blink every few seconds.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      timer = setTimeout(() => {
        Animated.sequence([
          Animated.timing(blink, { toValue: 0.1, duration: 70, useNativeDriver: true }),
          Animated.timing(blink, { toValue: 1, duration: 110, useNativeDriver: true }),
        ]).start(next);
      }, 2200 + Math.random() * 2800);
    };
    next();
    return () => clearTimeout(timer);
  }, [blink]);

  // Gentle breathing, and a soft pulsing ring while listening or speaking.
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [breathe, reduced]);

  useEffect(() => {
    const active = mood === "listening" || mood === "speaking";
    if (!active || reduced) {
      Animated.timing(ring, { toValue: active ? 1 : 0, duration: 200, useNativeDriver: true }).start();
      return;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(ring, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(ring, { toValue: 0.35, duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [mood, reduced, ring]);

  // Eyes glance up while thinking; brows lift while listening.
  useEffect(() => {
    Animated.parallel([
      Animated.timing(gaze, { toValue: mood === "thinking" ? 1 : 0, duration: 260, useNativeDriver: true }),
      Animated.timing(brows, { toValue: mood === "listening" ? 1 : mood === "thinking" ? 0.5 : 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [mood, gaze, brows]);

  // Lip movement: random syllable flaps while speaking, with a short close on each word boundary.
  useEffect(() => {
    if (mood !== "speaking" || reduced) {
      mouth.stopAnimation();
      Animated.timing(mouth, { toValue: 0, duration: 120, useNativeDriver: true }).start();
      return;
    }
    let alive = true;
    let pause: ReturnType<typeof setTimeout> | undefined;
    const flap = () => {
      if (!alive) return;
      Animated.sequence([
        Animated.timing(mouth, { toValue: 0.35 + Math.random() * 0.65, duration: 70 + Math.random() * 60, useNativeDriver: true }),
        Animated.timing(mouth, { toValue: 0.08 + Math.random() * 0.2, duration: 70 + Math.random() * 70, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) flap();
      });
    };
    flap();
    const unsubscribe = onWord?.(() => {
      if (!alive) return;
      mouth.stopAnimation();
      clearTimeout(pause);
      Animated.timing(mouth, { toValue: 0, duration: 50, useNativeDriver: true }).start();
      pause = setTimeout(flap, 60);
    });
    return () => {
      alive = false;
      clearTimeout(pause);
      unsubscribe?.();
      mouth.stopAnimation();
    };
  }, [mood, mouth, onWord, reduced]);

  const ringColor = mood === "listening" ? voice.mic : voice.brand;
  const bob = breathe.interpolate({ inputRange: [0, 1], outputRange: [0, -u(2)] });

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : "image"}
      accessibilityLabel={label}
      accessibilityElementsHidden={!label}
      importantForAccessibility={label ? "yes" : "no-hide-descendants"}
      style={{ width: size + u(16), height: size + u(16), alignItems: "center", justifyContent: "center" }}
    >
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { borderRadius: (size + u(16)) / 2, borderWidth: u(5), borderColor: ringColor, opacity: ring }]}
      />
      <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", backgroundColor: voice.brandSoft }}>
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: bob }] }]}>
          {/* Coat, shirt and the white advocate's bands */}
          <View style={box(u, 18, 118, 124, 60, { backgroundColor: COAT, borderTopLeftRadius: u(44), borderTopRightRadius: u(44) })} />
          <View style={box(u, 64, 110, 32, 52, { backgroundColor: "#ffffff", borderRadius: u(6) })} />
          <View style={box(u, 71, 124, 8, 22, { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#d6d3d1", borderRadius: u(2) })} />
          <View style={box(u, 81, 124, 8, 22, { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#d6d3d1", borderRadius: u(2) })} />
          {/* Neck, ears, head, hair */}
          <View style={box(u, 67, 98, 26, 22, { backgroundColor: SKIN_SHADE })} />
          <View style={box(u, 35, 62, 16, 20, { backgroundColor: SKIN_SHADE, borderRadius: u(8) })} />
          <View style={box(u, 109, 62, 16, 20, { backgroundColor: SKIN_SHADE, borderRadius: u(8) })} />
          <View style={box(u, 42, 26, 76, 86, { backgroundColor: SKIN, borderRadius: u(38) })} />
          <View style={box(u, 39, 20, 82, 34, { backgroundColor: HAIR, borderTopLeftRadius: u(41), borderTopRightRadius: u(41), borderBottomLeftRadius: u(14), borderBottomRightRadius: u(14) })} />
          {/* Brows */}
          <Animated.View style={[box(u, 56, 59, 17, 4, { backgroundColor: HAIR, borderRadius: u(2) }), { transform: [{ translateY: brows.interpolate({ inputRange: [0, 1], outputRange: [0, -u(3)] }) }] }]} />
          <Animated.View style={[box(u, 87, 59, 17, 4, { backgroundColor: HAIR, borderRadius: u(2) }), { transform: [{ translateY: brows.interpolate({ inputRange: [0, 1], outputRange: [0, -u(3)] }) }] }]} />
          {/* Eyes */}
          {[58, 90].map((left) => (
            <View key={left} style={box(u, left, 66, 13, 12, { backgroundColor: "#ffffff", borderRadius: u(6), overflow: "hidden", alignItems: "center", justifyContent: "center" })}>
              <Animated.View
                style={{
                  width: u(8), height: u(8), borderRadius: u(4), backgroundColor: INK,
                  transform: [
                    { translateX: gaze.interpolate({ inputRange: [0, 1], outputRange: [0, u(2)] }) },
                    { translateY: gaze.interpolate({ inputRange: [0, 1], outputRange: [0, -u(2.5)] }) },
                    { scaleY: blink },
                  ],
                }}
              />
            </View>
          ))}
          {/* Nose */}
          <View style={box(u, 77, 78, 7, 12, { backgroundColor: SKIN_SHADE, borderRadius: u(4), opacity: 0.6 })} />
          {/* Mouth: a resting smile that gives way to an open mouth while talking */}
          <Animated.View
            style={[
              box(u, 67, 89, 26, 10, { borderBottomWidth: u(3), borderColor: "#7c2d12", borderBottomLeftRadius: u(13), borderBottomRightRadius: u(13) }),
              { opacity: mouth.interpolate({ inputRange: [0, 0.15], outputRange: [1, 0], extrapolate: "clamp" }) },
            ]}
          />
          <Animated.View
            style={[
              box(u, 69, 92, 22, 14, { backgroundColor: "#5b1a1a", borderRadius: u(8), overflow: "hidden" }),
              {
                opacity: mouth.interpolate({ inputRange: [0, 0.15], outputRange: [0, 1], extrapolate: "clamp" }),
                transform: [{ scaleY: mouth.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }) }],
              },
            ]}
          >
            <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: u(4), backgroundColor: "#ffffff" }} />
          </Animated.View>
        </Animated.View>
      </View>
    </Pressable>
  );
}

function box(u: (n: number) => number, left: number, top: number, width: number, height: number, extra: object) {
  return { position: "absolute" as const, left: u(left), top: u(top), width: u(width), height: u(height), ...extra };
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => active && setReduced(value)).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => {
      active = false;
      sub.remove();
    };
  }, []);
  return reduced;
}
