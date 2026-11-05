import { useState } from "react";

export default function BookingModal({ advocate, onCreate, isSubmitting = false }) {
  const [userName, setUserName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [amount, setAmount] = useState(500);
  const [error, setError] = useState("");

  const submit = (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (!userName.trim() || !scheduledAt || new Date(scheduledAt).getTime() <= Date.now()) {
      setError("Enter your name and choose a future consultation time.");
      return;
    }
    if (userPhone && !/^\+?[\d\s()-]{10,20}$/.test(userPhone)) {
      setError("Enter a valid phone number or leave it blank.");
      return;
    }
    if (!Number.isFinite(amount) || amount < 1) {
      setError("Enter a consultation fee of at least ₹1.");
      return;
    }
    setError("");
    onCreate({ userName: userName.trim(), userPhone, advocateId: advocate?._id, scheduledAt: new Date(scheduledAt).toISOString(), amount });
  };

  return (
    <form className="card animate-in" onSubmit={submit}>
      <h3>Request consultation: {advocate?.name}</h3>
      <p>Your preferred time and fee require agreement with the advocate.</p>
      <label className="label" htmlFor="booking-name">Your Name</label>
      <input id="booking-name" required maxLength={120} value={userName} onChange={(e) => setUserName(e.target.value)} autoComplete="name" />
      <label className="label" htmlFor="booking-phone">Phone (optional)</label>
      <input id="booking-phone" type="tel" value={userPhone} onChange={(e) => setUserPhone(e.target.value)} autoComplete="tel" />
      <label className="label" htmlFor="booking-time">Preferred Date & Time</label>
      <input id="booking-time" required type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
      <label className="label" htmlFor="booking-fee">Proposed Consultation Fee (INR)</label>
      <input id="booking-fee" required type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
      <button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Save consultation request"}</button>
      {error ? <p className="error" role="alert">{error}</p> : null}
    </form>
  );
}
