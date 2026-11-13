import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@convex-api";
import { useServiceQuery } from "../state/ConvexServices";
import { useAppState } from "../state/AppContext";
export default function AdvocateDirectory() {
  const [domain, setDomain] = useState(""), [city, setCity] = useState(""), [cursor, setCursor] = useState(null);
  const { data, error } = useServiceQuery(api.advocates.listPublic, { ...(domain ? { domain } : {}), ...(city.trim() ? { city: city.trim() } : {}), paginationOpts: { cursor, numItems: 12 } }, false);
  const { setSelectedAdvocate } = useAppState(); const navigate = useNavigate();
  return <section className="match-panel dash-surface"><h2>Approved advocates</h2><p>Profiles and available slots come from the shared Convex service.</p>
    <label>Practice area <select value={domain} onChange={e => { setDomain(e.target.value); setCursor(null); }}><option value="">All areas</option>{["criminal", "civil", "property", "family", "employment", "consumer", "other"].map(d => <option key={d}>{d}</option>)}</select></label>
    <label>City <input value={city} onChange={e => { setCity(e.target.value); setCursor(null); }} maxLength={100} /></label>
    {error && <p role="alert">{error}</p>}
    {data?.page.length === 0 && <p>No approved advocates match these filters.</p>}
    {!data && !error && <p>Profiles appear when the Convex service is configured and connected.</p>}
    <div className="match-panel-list">{data?.page.map(a => <article className="match-card" key={a._id}>
      <h3>{a.displayName}</h3><p>{a.city} · {a.yearsExperience} years</p><p>{a.domains.join(", ")}</p><p>Languages: {a.locales.join(", ")}</p>
      <p>{a.rating.count ? `${a.rating.average.toFixed(1)} / 5 from ${a.rating.count} published reviews` : "No published reviews"}</p>
      <p>{a.slots.length} available slots</p>
      <div className="match-card-actions"><button onClick={() => { setSelectedAdvocate(a); navigate("/profile"); }}>View profile</button><button className="secondary-btn" onClick={() => { setSelectedAdvocate(a); navigate("/booking"); }}>Request consultation</button></div>
    </article>)}</div>
    {data && !data.isDone && <button onClick={() => setCursor(data.continueCursor)}>Next advocates</button>}
    {cursor && <button className="secondary-btn" onClick={() => setCursor(null)}>Back to first page</button>}
  </section>;
}
