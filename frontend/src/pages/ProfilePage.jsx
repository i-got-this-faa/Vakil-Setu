import { Link } from "react-router-dom";
import { useAppState } from "../state/AppContext";
import { cleanAdvocateName, formatExpertise } from "../utils/advocateDisplay";

export default function ProfilePage() {
  const { selectedAdvocate: advocate } = useAppState();
  return (
    <main className="container">
      <section className="hero compact">
        <p className="eyebrow">Advocate profile</p>
        <h1>{advocate ? cleanAdvocateName(advocate.name) : "Select an advocate"}</h1>
      </section>
      {advocate ? (
        <section className="card">
          <p><strong>Practice areas:</strong> {formatExpertise(advocate.expertise).join(", ")}</p>
          <p><strong>Experience:</strong> {advocate.experienceYears ?? 0} years</p>
          <p><strong>Languages:</strong> {advocate.languages?.join(", ") || "Not listed"}</p>
          <p>Availability and consultation time must be confirmed with the advocate.</p>
          <Link to="/booking">Request a consultation</Link>
        </section>
      ) : <p>Choose “View profile” from the results to see an advocate’s details.</p>}
      <p><Link to="/results">Back to results</Link></p>
    </main>
  );
}
