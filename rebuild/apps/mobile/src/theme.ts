import { Platform } from "react-native";

// Visual tokens match the active Vite website; native device fonts avoid remote font loading.
export const colors = {
  primary: "#4f46e5",
  primarySurface: "#eef2ff",
  primaryBorder: "#c7d2fe",
  background: "#f8fafc",
  disabledText: "#64748b",
  primaryPressed: "#4338ca",
  onPrimary: "#ffffff",
  ink: "#0f172a",
  muted: "#52617a",
  surface: "#ffffff",
  subtle: "#f1f5f9",
  border: "#e2e8f0",
  disabled: "#e2e8f0",
  danger: "#b91c1c",
  dangerSurface: "#fef2f2",
  warning: "#854d0e",
  warningSurface: "#fefce8",
  success: "#166534",
  successSurface: "#f0fdf4",
  info: "#3730a3",
  infoSurface: "#eef2ff",
} as const;

export const fonts = { heading: Platform.select({ ios: "Georgia", android: "serif", default: "Georgia" }) } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const radius = { sm: 6, md: 12 } as const;
/** Minimum touch target for controls, comfortable on small Android phones. */
export const TOUCH_TARGET = 48;
