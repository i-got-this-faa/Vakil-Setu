import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { STRINGS } from "../lib/strings";
import { colors, fonts, radius, space, TOUCH_TARGET } from "../theme";

/**
 * Scrollable screen body. Top insets are applied by the navigator: stack screens sit under a
 * header, and the tab layout applies a top safe-area edge itself (see app/(tabs)/_layout.tsx).
 */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return <Text accessibilityRole="header" style={styles.title}>{children}</Text>;
}

export function Heading({ children }: { children: ReactNode }) {
  return <Text accessibilityRole="header" style={styles.heading}>{children}</Text>;
}

export function Body({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return <Text style={[styles.body, muted && styles.muted]}>{children}</Text>;
}

export function Small({ children }: { children: ReactNode }) {
  return <Text style={styles.small}>{children}</Text>;
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

type ButtonVariant = "primary" | "secondary" | "danger";
export function Button({
  label,
  onPress,
  disabled = false,
  busy = false,
  busyLabel,
  variant = "primary",
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  busyLabel?: string;
  variant?: ButtonVariant;
  accessibilityHint?: string;
}) {
  const inactive = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy }}
      accessibilityHint={accessibilityHint}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variantStyle(variant),
        inactive && styles.buttonDisabled,
        pressed && !inactive && styles.buttonPressed,
      ]}
    >
      {busy ? <ActivityIndicator color={inactive ? colors.disabledText : variant === "secondary" ? colors.primary : colors.onPrimary} style={styles.spinner} /> : null}
      <Text style={[styles.buttonText, variant === "secondary" && styles.buttonTextSecondary, inactive && styles.buttonTextDisabled]}>
        {busy && busyLabel ? busyLabel : label}
      </Text>
    </Pressable>
  );
}

function variantStyle(variant: ButtonVariant) {
  switch (variant) {
    case "secondary": return styles.buttonSecondary;
    case "danger": return styles.buttonDanger;
    default: return styles.buttonPrimary;
  }
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {hint ? <Small>{hint}</Small> : null}
    </View>
  );
}

export function TextField(props: TextInputProps & { label: string; hint?: string }) {
  const { label, hint, multiline, style, ...input } = props;
  return (
    <Field label={label} hint={hint}>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        textAlignVertical={multiline ? "top" : "center"}
        multiline={multiline}
        style={[styles.input, multiline && styles.inputMultiline, style]}
        {...input}
      />
    </Field>
  );
}

export function Checkbox({ checked, onChange, label, disabled = false }: { checked: boolean; onChange: (value: boolean) => void; label: ReactNode; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      style={({ pressed }) => [styles.checkRow, pressed && !disabled && styles.buttonPressed]}
    >
      <View style={[styles.checkBox, checked && styles.checkBoxChecked, disabled && styles.buttonDisabled]}>
        {checked ? <Text style={styles.checkMark}>✓</Text> : null}
      </View>
      <View style={styles.checkLabel}>{typeof label === "string" ? <Small>{label}</Small> : label}</View>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.buttonPressed]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "success" | "warning" | "danger" }) {
  return (
    <View style={[styles.badge, badgeTone(tone)]} accessibilityLabel={`Status: ${label}`}>
      <Text style={[styles.badgeText, badgeTextTone(tone)]}>{label}</Text>
    </View>
  );
}

function badgeTone(tone: "neutral" | "success" | "warning" | "danger") {
  switch (tone) {
    case "success": return { backgroundColor: colors.successSurface };
    case "warning": return { backgroundColor: colors.warningSurface };
    case "danger": return { backgroundColor: colors.dangerSurface };
    default: return { backgroundColor: colors.subtle };
  }
}

function badgeTextTone(tone: "neutral" | "success" | "warning" | "danger") {
  switch (tone) {
    case "success": return { color: colors.success };
    case "warning": return { color: colors.warning };
    case "danger": return { color: colors.danger };
    default: return { color: colors.ink };
  }
}

/** Errors use role=alert; informational status uses a polite live region. */
export function Notice({ tone = "info", children }: { tone?: "info" | "warning" | "error" | "success"; children: ReactNode }) {
  const palette = noticePalette(tone);
  return (
    <View
      accessibilityRole={tone === "error" ? "alert" : "text"}
      accessibilityLiveRegion={tone === "error" ? "assertive" : "polite"}
      style={[styles.notice, { backgroundColor: palette.background, borderColor: palette.border }]}
    >
      <Text style={[styles.noticeText, { color: palette.text }]}>{children}</Text>
    </View>
  );
}

function noticePalette(tone: "info" | "warning" | "error" | "success") {
  switch (tone) {
    case "error": return { background: colors.dangerSurface, border: colors.danger, text: colors.danger };
    case "warning": return { background: colors.warningSurface, border: colors.warning, text: colors.warning };
    case "success": return { background: colors.successSurface, border: colors.success, text: colors.success };
    default: return { background: colors.infoSurface, border: colors.info, text: colors.info };
  }
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <Card>
      <Heading>{title}</Heading>
      {children ? <Body muted>{children}</Body> : null}
      {action ? <View style={styles.actionRow}>{action}</View> : null}
    </Card>
  );
}

export function Loading({ label }: { label: string }) {
  return (
    <View style={styles.loading} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator color={colors.primary} />
      <Small>{label}</Small>
    </View>
  );
}

type PagingStatus = "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";

/** Pagination control for Convex usePaginatedQuery results. Renders nothing when no further page exists. */
export function LoadMoreButton({ status, onLoadMore }: { status: PagingStatus; onLoadMore: () => void }) {
  if (status !== "CanLoadMore" && status !== "LoadingMore") return null;
  return <Button variant="secondary" label={STRINGS.loadMore} busyLabel={STRINGS.loading} busy={status === "LoadingMore"} onPress={onLoadMore} />;
}

export function Row({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

export function Stack({ children }: { children: ReactNode }) {
  return <View style={styles.stack}>{children}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.xl, gap: space.lg, paddingBottom: space.xl * 2, width: "100%", maxWidth: 680, alignSelf: "center" },
  title: { fontFamily: fonts.heading, fontSize: 32, lineHeight: 40, fontWeight: "400", letterSpacing: -0.7, color: colors.ink },
  heading: { fontFamily: fonts.heading, fontSize: 22, lineHeight: 29, fontWeight: "400", color: colors.ink },
  body: { fontSize: 16, lineHeight: 23, color: colors.ink },
  muted: { color: colors.muted },
  small: { fontSize: 14, lineHeight: 20, color: colors.muted },
  card: { gap: space.md, padding: space.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  button: { minHeight: TOUCH_TARGET, paddingHorizontal: space.lg, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: space.sm },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  buttonDanger: { backgroundColor: colors.danger },
  buttonDisabled: { backgroundColor: colors.disabled, borderColor: colors.disabled },
  buttonPressed: { opacity: 0.85 },
  buttonText: { color: colors.onPrimary, fontSize: 15, fontWeight: "600" },
  buttonTextSecondary: { color: colors.primary },
  buttonTextDisabled: { color: colors.disabledText },
  spinner: { marginRight: space.xs },
  field: { gap: space.xs },
  label: { fontSize: 14, fontWeight: "600", color: colors.muted },
  input: { minHeight: TOUCH_TARGET, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: space.md, paddingVertical: space.sm, fontSize: 16, color: colors.ink, backgroundColor: colors.surface },
  inputMultiline: { minHeight: 120 },
  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: space.md, minHeight: TOUCH_TARGET },
  checkBox: { width: 26, height: 26, borderRadius: 6, borderWidth: 2, borderColor: colors.primary, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  checkBoxChecked: { backgroundColor: colors.primary },
  checkMark: { color: colors.onPrimary, fontWeight: "700", fontSize: 16 },
  checkLabel: { flex: 1 },
  chip: { minHeight: TOUCH_TARGET, paddingHorizontal: space.md, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  chipSelected: { backgroundColor: colors.primarySurface, borderColor: colors.primaryBorder },
  chipText: { fontSize: 15, color: colors.ink, fontWeight: "600" },
  chipTextSelected: { color: colors.primaryPressed },
  badge: { alignSelf: "flex-start", paddingHorizontal: space.sm, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 13, fontWeight: "700" },
  notice: { borderWidth: 1, borderRadius: radius.sm, padding: space.md },
  noticeText: { fontSize: 15, lineHeight: 21 },
  actionRow: { gap: space.sm },
  loading: { alignItems: "center", gap: space.sm, padding: space.xl },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, flexWrap: "wrap" },
  stack: { gap: space.md },
});
