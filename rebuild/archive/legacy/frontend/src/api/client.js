const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
}

export async function classifyIssue(text) {
  return request("/api/ai/classify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });
}

/** Single request: classify issue + match advocates (smoother home flow). */
export async function triageIssue(text, history = []) {
  return request("/api/ai/triage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, history })
  });
}

export async function matchAdvocates(domain) {
  return request("/api/advocates/match", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domain })
  });
}

export async function createBooking(payload) {
  return request("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export async function createPaymentOrder(bookingId) {
  return request("/api/payments/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bookingId })
  });
}

export async function verifyPayment(payload) {
  return request("/api/payments/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export async function confirmBookingWithoutPayment(bookingId) {
  return request("/api/payments/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bookingId, skipPayment: true })
  });
}

export async function triggerEmergency() {
  return request("/api/emergency", { method: "POST" });
}
