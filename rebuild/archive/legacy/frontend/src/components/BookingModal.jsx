import { useState } from "react";

export default function BookingModal({ advocate, onCreate }) {
  const [userName, setUserName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [amount, setAmount] = useState(500);

  return (
    <div className="card animate-in">
      <h3>Book Advocate: {advocate?.name}</h3>
      <label className="label">Your Name</label>
      <input value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Enter full name" />

      <label className="label">Phone (optional)</label>
      <input value={userPhone} onChange={(e) => setUserPhone(e.target.value)} placeholder="10-digit phone number" />

      <label className="label">Schedule Date & Time</label>
      <input
        type="datetime-local"
        value={scheduledAt}
        onChange={(e) => setScheduledAt(e.target.value)}
      />

      <label className="label">Consultation Fee (INR)</label>
      <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />

      <button
        onClick={() =>
          onCreate({
            userName,
            userPhone,
            advocateId: advocate?._id,
            scheduledAt,
            amount
          })
        }
      >
        Create Booking
      </button>
    </div>
  );
}
