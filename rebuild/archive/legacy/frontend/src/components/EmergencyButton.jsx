import { useState } from "react";
import { triggerEmergency } from "../api/client";

export default function EmergencyButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleEmergency = async () => {
    try {
      setLoading(true);
      const data = await triggerEmergency();
      setMessage(`Connected to ${data.advocate.name} (Rating ${data.advocate.rating})`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="emergency-container">
      <button className="emergency-btn" onClick={handleEmergency} disabled={loading}>
        {loading ? "Connecting..." : "Emergency Help"}
      </button>
      {message ? <div className="emergency-msg">{message}</div> : null}
    </div>
  );
}
