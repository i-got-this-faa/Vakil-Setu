import { Link } from "react-router-dom";
import { api } from "@convex-api";
import { useAppState } from "../state/AppContext";
import { useServiceQuery } from "../state/ConvexServices";
export default function ProfilePage() {
  const { selectedAdvocate } = useAppState();
  const { data: advocate, error } = useServiceQuery(api.advocates.getPublic, selectedAdvocate ? { advocateId: selectedAdvocate._id } : null, false);
  return <main className="container"><section className="hero compact"><p className="eyebrow">Advocate profile</p><h1>{advocate?.displayName || "Select an advocate"}</h1></section>
    {error && <p role="alert">{error}</p>}{advocate && <section className="card"><p>{advocate.bio}</p><p>{advocate.city} · {advocate.yearsExperience} years</p><p>Practice areas: {advocate.domains.join(", ")}</p><p>Languages: {advocate.locales.join(", ")}</p><p>Modes: {advocate.consultationModes.join(", ")}</p><Link to="/booking">Choose a consultation slot</Link></section>}
    {advocate === null && <p>This profile is no longer available for new requests.</p>}<p><Link to="/results">Back to advocates</Link></p></main>;
}
