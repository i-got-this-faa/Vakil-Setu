import { useState } from "react";
import { triggerEmergency } from "../api/client";

export default function EmergencyButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleEmergency = async () => {
    try {
      setLoading(true);
      const data = await triggerEmergency();
      setMessage(`Listed advocate: ${data.advocate.name}. No call or message has been sent. For immediate danger in India, call 112.`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="emergency-container">
      <button className="emergency-btn" onClick={handleEmergency} disabled={loading}>
        {loading ? "Searching..." : "Find an advocate"}
      </button>
      {message ? <div className="emergency-msg" role="status">{message}</div> : null}
    </div>
  );
}
