import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

type IconName = ComponentProps<typeof Ionicons>["name"];

/** Voice-first visual language: very large targets, an icon on every action, high contrast, few words. */
export const voice = {
  bg: "#fbf7f2",
  card: "#ffffff",
  ink: "#1c1917",
  muted: "#57534e",
  line: "#e7e5e4",
  brand: "#4f46e5",
  brandSoft: "#eef2ff",
  mic: "#dc2626",
  micSoft: "#fee2e2",
  lawyer: "#0f766e",
  lawyerSoft: "#ccfbf1",
  warn: "#92400e",
  warnSoft: "#fef3c7",
  ok: "#166534",
  okSoft: "#dcfce7",
} as const;

export function BigButton({ icon, label, onPress, tone = "brand", busy = false, disabled = false }: {
  icon: IconName; label: string; onPress: () => void; tone?: "brand" | "lawyer" | "plain"; busy?: boolean; disabled?: boolean;
}) {
  const palette = tone === "lawyer" ? { bg: voice.lawyer, fg: "#fff" } : tone === "plain" ? { bg: voice.card, fg: voice.ink } : { bg: voice.brand, fg: "#fff" };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [styles.big, { backgroundColor: palette.bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 }, tone === "plain" && styles.bigPlain]}
    >
      {busy ? <ActivityIndicator color={palette.fg} /> : <Ionicons name={icon} size={28} color={palette.fg} />}
      <Text style={[styles.bigLabel, { color: palette.fg }]}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, label, onPress, showLabel = false }: { icon: IconName; label: string; onPress: () => void; showLabel?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8} style={({ pressed }) => [styles.icon, pressed && { opacity: 0.6 }]}>
      <Ionicons name={icon} size={26} color={voice.ink} />
      {showLabel ? <Text style={styles.iconLabel} numberOfLines={1}>{label}</Text> : null}
    </Pressable>
  );
}

export function Card({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "warn" | "ok" | "lawyer" }) {
  const bg = tone === "warn" ? voice.warnSoft : tone === "ok" ? voice.okSoft : tone === "lawyer" ? voice.lawyerSoft : voice.card;
  return <View style={[styles.card, { backgroundColor: bg }]}>{children}</View>;
}

export function Big({ children, rtl = false }: { children: ReactNode; rtl?: boolean }) {
  return <Text style={[styles.bigText, rtl && styles.rtl]}>{children}</Text>;
}
export function Plain({ children, muted = false, rtl = false }: { children: ReactNode; muted?: boolean; rtl?: boolean }) {
  return <Text style={[styles.plain, muted && { color: voice.muted }, rtl && styles.rtl]}>{children}</Text>;
}

const styles = StyleSheet.create({
  big: { minHeight: 64, borderRadius: 18, paddingHorizontal: 20, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  bigPlain: { borderWidth: 2, borderColor: voice.line },
  bigLabel: { fontSize: 20, fontWeight: "700", flexShrink: 1, textAlign: "center" },
  icon: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  iconLabel: { fontSize: 12, color: voice.ink, marginTop: 2, maxWidth: 90 },
  card: { borderRadius: 18, padding: 16, gap: 10, borderWidth: 1, borderColor: voice.line },
  bigText: { fontSize: 22, lineHeight: 32, color: voice.ink },
  plain: { fontSize: 17, lineHeight: 25, color: voice.ink },
  rtl: { writingDirection: "rtl", textAlign: "right" },
});
