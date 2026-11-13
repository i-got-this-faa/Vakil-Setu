import { useState } from "react";
import { api } from "@convex-api";
import { useServices, useServiceQuery } from "../state/ConvexServices";
import { serviceError } from "../services/convexConfig";
export default function NotificationsPage() {
  const { client } = useServices(); const [cursor, setCursor] = useState(null), [error, setError] = useState("");
  const query = useServiceQuery(api.notifications.mine, { paginationOpts: { cursor, numItems: 20 } });
  return <main className="container"><h1>Notifications</h1>{(query.error || error) && <p role="alert">{query.error || error}</p>}{query.data?.page.length === 0 && <p>No notifications yet.</p>}{query.data?.page.map(n => <article className="card" key={n._id}><p>{n.message}</p>{n.readAt === undefined && <button onClick={async () => { try { await client.mutation(api.notifications.markRead, { notificationId: n._id }); } catch (err) { setError(serviceError(err)); } }}>Mark read</button>}</article>)}{query.data && !query.data.isDone && <button onClick={() => setCursor(query.data.continueCursor)}>Older notifications</button>}{cursor && <button onClick={() => setCursor(null)}>Latest notifications</button>}</main>;
}
