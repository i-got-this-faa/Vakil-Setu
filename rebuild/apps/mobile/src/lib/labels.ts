
/**
 * English labels for server-controlled values that have no draft translation yet.
 * Unknown values describe themselves rather than inventing a meaning.
 */
export function consultationModeLabel(value: string): string {
  switch (value) {
    case "phone": return "Phone";
    case "video": return "Video";
    case "in_person": return "In person";
    default: return "Not listed";
  }
}

export function urgencyLabel(value: string): string {
  switch (value) {
    case "low": return "Low";
    case "medium": return "Medium";
    case "high": return "High";
    case "emergency": return "Emergency — no guaranteed response";
    case "unknown": return "Unknown";
    default: return "Unmarked";
  }
}

export function bookingStateLabel(state: string): string {
  switch (state) {
    case "pending": return "Awaiting advocate";
    case "accepted": return "Accepted";
    case "declined": return "Declined";
    case "cancelled": return "Cancelled";
    case "completed": return "Completed";
    case "expired": return "Expired";
    default: return "Unknown status";
  }
}

export function bookingStateTone(state: string): "neutral" | "success" | "warning" | "danger" {
  switch (state) {
    case "accepted":
    case "completed":
      return "success";
    case "pending":
      return "warning";
    case "declined":
    case "cancelled":
    case "expired":
      return "danger";
    default:
      return "neutral";
  }
}

export function caseStateLabel(state: string): string {
  switch (state) {
    case "draft": return "Draft";
    case "shared": return "Shared";
    default: return "Unknown status";
  }
}

export function bookingActorLabel(kind: string): string {
  switch (kind) {
    case "system": return "Service";
    case "user": return "You or the user";
    case "advocate": return "Advocate";
    case "admin": return "Administrator";
    default: return "Unknown actor";
  }
}

/** Describes a recorded booking event. Matches the web wording for the same events. */
export function bookingEventText(event: {
  readonly kind: string;
  readonly from?: string;
  readonly to?: string;
  readonly reason?: string;
  readonly action?: string;
}): string {
  switch (event.kind) {
    case "requested":
      return "Consultation requested and awaiting advocate acceptance.";
    case "state_changed":
      return `Status changed from ${event.from ?? "unknown"} to ${event.to ?? "unknown"}.${event.reason ? ` Recorded reason: ${event.reason}` : ""}`;
    case "affected":
      return `Flagged for administrator handling. ${event.reason ?? ""}`.trim();
    case "admin_handled":
      return `Administrator ${event.action === "retain" ? "retained" : "cancelled"} this consultation. ${event.reason ?? ""}`.trim();
    default:
      return "Recorded event.";
  }
}
