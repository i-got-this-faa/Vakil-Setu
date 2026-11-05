const progress = { accepted: 0, queued: 1, sending: 2, sent: 3, delivered: 4, read: 5 };
const failures = new Set(["failed", "undelivered"]);
export const validDeliveryStatus = (status) => Object.hasOwn(progress, status) || failures.has(status);

// Keep provider delivery independent from consultation/appointment acceptance.
export function mergeDelivery(previous, event) {
  if (!validDeliveryStatus(event.status)) throw new Error("Invalid delivery status");
  const key = `${event.status}:${event.errorCode || ""}`;
  if (previous?.events?.some((item) => item.key === key)) return previous;
  const next = { ...previous, sid: event.sid, events: [...(previous?.events || []), { key, status: event.status, errorCode: event.errorCode, at: new Date().toISOString() }].slice(-20) };
  const before = previous?.status;
  const after = event.status;
  // Late queued/sent callbacks cannot undo delivery/read or a terminal failure.
  const advance = !before || (failures.has(after) ? !["delivered", "read"].includes(before) : failures.has(before) ? false : progress[after] >= progress[before]);
  if (advance) Object.assign(next, { status: after, errorCode: event.errorCode, updatedAt: new Date().toISOString() });
  return next;
}
