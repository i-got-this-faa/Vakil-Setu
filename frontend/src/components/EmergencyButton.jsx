import { Link } from "react-router-dom";
export default function EmergencyButton() {
  return <div className="emergency-container"><Link to="/results" className="emergency-btn">Find an advocate</Link></div>;
}
