import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@convex-api";
import { useAppState } from "../state/AppContext";
import { useServiceQuery } from "../state/ConvexServices";
import { bookingRequest, serviceError } from "../services/convexConfig";
const time = value => new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
export default function BookingPage() {
  const state = useAppState();
  const { data: slots, error: slotError } = useServiceQuery(api.slots.listPublic, state.selectedAdvocate ? { advocateId: state.selectedAdvocate._id } : null, false);
  const [slotId, setSlotId] = useState(""), [consent, setConsent] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(""), [receipt, setReceipt] = useState(null);
  const request = useRef(null); const sending = useRef(false);
  const version = state.currentCase.data?.case.summaryVersion || 0;
  const signature = `${state.activeCaseId}:${version}:${state.selectedAdvocate?._id}:${slotId}`;
  useEffect(() => { setConsent(false); setReceipt(null); request.current = null; }, [signature]);
  const saved = state.currentCase.data?.summaries[0];
  const slot = slots?.find(s => s._id === slotId);
  async function submit(e) {
    e.preventDefault(); if (sending.current) return;
    sending.current = true; setBusy(true); setError("");
    try {
      if (state.services.status !== "ready" || !slot) throw new Error("Choose a currently available slot while signed in.");
      request.current ||= crypto.randomUUID();
      const payload = bookingRequest({ slotId, caseId: state.activeCaseId, summaryVersion: version, advocateId: state.selectedAdvocate._id, consent, requestId: request.current });
      const id = await state.services.client.mutation(api.bookings.request, payload);
      setReceipt(id); setConsent(false);
    } catch (err) { setError(err instanceof Error && !("data" in err) ? err.message : serviceError(err)); }
    finally { sending.current = false; setBusy(false); }
  }
  return <main className="container"><section className="hero compact"><p className="eyebrow">Consultation</p><h1>Consultation requests</h1></section>
    {state.selectedAdvocate ? <form className="card" onSubmit={submit}><h2>{state.selectedAdvocate.displayName}</h2>
      {slotError && <p role="alert">{slotError}</p>}
      <label>Available slot (IST)<select value={slotId} onChange={e => setSlotId(e.target.value)} disabled={busy}><option value="">Choose a slot</option>{slots?.map(s => <option key={s._id} value={s._id}>{time(s.start)} · {s.durationMinutes} min · {s.consultationMode}</option>)}</select></label>
      {slots?.length === 0 && <p>No slots are currently available.</p>}
      {saved ? <><p>Summary version {version} to be shared:</p><blockquote>{saved.summary.text}</blockquote><p>{saved.summary.actions.join(" · ")}</p></> : <p><Link to="/results">Save a reviewed case summary before requesting a consultation.</Link></p>}
      <label className="consent-check"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} disabled={busy || !saved} /> Share this exact saved summary version with {state.selectedAdvocate.displayName} for this consultation request.</label>
      <button disabled={busy || !consent || !saved || !slot || state.services.status !== "ready"}>{busy ? "Requesting…" : "Request consultation"}</button>
      {receipt && <p role="status">Request saved. Advocate acceptance is pending; see your booking history below.</p>}
      {error && <p role="alert">{error}</p>}
      <p>Payments are outside the current Convex pilot. A request is not a confirmed appointment.</p>
    </form> : <p><Link to="/results">Choose an approved advocate</Link> to request a slot.</p>}
    <BookingHistory />
  </main>;
}
function BookingHistory() {
  const { services } = useAppState(); const [cursor, setCursor] = useState(null), [selected, setSelected] = useState(null), [error, setError] = useState("");
  const { data, error: loadError } = useServiceQuery(api.bookings.mine, { paginationOpts: { cursor, numItems: 20 } });
  const history = useServiceQuery(api.bookings.history, selected ? { bookingId: selected, paginationOpts: { cursor: null, numItems: 50 } } : null);
  return <section className="card"><h2>Your bookings</h2>{(loadError || error) && <p role="alert">{loadError || error}</p>}{data?.page.length === 0 && <p>No consultation requests yet.</p>}
    {data?.page.map(b => <article className="booking-history-item" key={b._id}><strong>{b.state}</strong><p>{time(b.start)} IST · {b.consultationMode}</p><p>{b.summarySnapshot.text.slice(0, 160)}</p>
      <button className="secondary-btn" onClick={() => setSelected(selected === b._id ? null : b._id)}>View events</button>
      {["pending", "accepted"].includes(b.state) && b.start > Date.now() && <button className="secondary-btn" onClick={async () => { setError(""); try { await services.client.mutation(api.bookings.transition, { bookingId: b._id, action: "cancel" }); } catch (err) { setError(serviceError(err)); } }}>Cancel request</button>}
      {selected === b._id && <div>{history.error && <p role="alert">{history.error}</p>}{history.data?.page.map(event => <p key={event._id}>{event.event.kind} · {time(event.at)} IST</p>)}</div>}
    </article>)}
    {data && !data.isDone && <button onClick={() => setCursor(data.continueCursor)}>Older bookings</button>}{cursor && <button onClick={() => setCursor(null)}>Latest bookings</button>}
  </section>;
}
