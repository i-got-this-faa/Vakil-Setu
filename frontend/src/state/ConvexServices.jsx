import { Component, createContext, useContext, useEffect, useRef, useState } from "react";
import { ClerkProvider, useAuth, SignInButton, UserButton } from "@clerk/react";
import { ConvexReactClient, useConvexAuth, useMutation, useQuery } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { getFunctionName } from "convex/server";
import { api } from "@convex-api";
import { parseConvexConfig, serviceError } from "../services/convexConfig";

export const ServicesContext = createContext({ status: "unconfigured", client: null, userId: null, account: null });
export const useServices = () => useContext(ServicesContext);
// Read at render time (not module load) so tests can control the environment with vi.stubEnv.
export function ConvexServices({ children }) {
  const config = parseConvexConfig(import.meta.env);
  if (config.kind !== "configured") return <ServicesContext.Provider value={{ status: "unconfigured", client: null, userId: null, account: null }}>{children}</ServicesContext.Provider>;
  return <ClerkProvider publishableKey={config.key}><ConfiguredServices url={config.url}>{children}</ConfiguredServices></ClerkProvider>;
}
function ConfiguredServices({ url, children }) {
  const [client] = useState(() => new ConvexReactClient(url));
  const closeTimer = useRef(null);
  useEffect(() => { clearTimeout(closeTimer.current); return () => { closeTimer.current = setTimeout(() => client.close(), 0); }; }, [client]);
  return <ConvexProviderWithClerk client={client} useAuth={useAuth}><IdentityBoundary client={client}>{children}</IdentityBoundary></ConvexProviderWithClerk>;
}
function IdentityBoundary({ client, children }) {
  const { userId } = useAuth();
  return <ServiceBoundary key={userId || "public"} fallback={children}><Identity client={client}>{children}</Identity></ServiceBoundary>;
}
class ServiceBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <ServicesContext.Provider value={{ status: "blocked", client: null, userId: null, account: null }}>{this.props.fallback}</ServicesContext.Provider> : this.props.children;
  }
}
function Identity({ client, children }) {
  const auth = useAuth();
  const convex = useConvexAuth();
  const account = useQuery(api.accounts.me, convex.isAuthenticated ? {} : "skip");
  const status = !auth.isLoaded || convex.isLoading ? "loading" : !auth.isSignedIn ? "signed_out" : !convex.isAuthenticated || account === undefined ? "loading" : account === null ? "onboarding" : account.disabled || account.role !== "user" ? "blocked" : "ready";
  return <ServicesContext.Provider value={{ status, client, userId: auth.userId || null, account }}>{children}</ServicesContext.Provider>;
}
export function AuthControls() {
  const services = useServices();
  if (services.status === "unconfigured") return <span className="service-note">Account services not configured</span>;
  if (services.status === "signed_out") return <SignInButton mode="modal"><button type="button" className="app-header-link-btn">Sign in</button></SignInButton>;
  return <UserButton />;
}
export function ServiceNotice() {
  const { status } = useServices();
  if (status === "ready") return null;
  return <aside className="service-notice" role="status">
    {status === "unconfigured" ? "Account services are not configured. You can view the avatar; saving, AI and booking are unavailable." : status === "signed_out" ? "Sign in to save cases, continue chat and request a consultation." : status === "loading" ? "Connecting your account…" : status === "blocked" ? "This account cannot use the client workspace. Advocate and admin operations remain in their existing workspace." : <Onboarding />}
  </aside>;
}
function Onboarding() {
  const ensure = useMutation(api.accounts.ensure);
  const [name, setName] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  return <form onSubmit={async e => { e.preventDefault(); if (busy) return; setBusy(true); setError(""); try { await ensure({ role: "user", displayName: name.trim(), locale: "en" }); } catch (err) { setError(serviceError(err)); } finally { setBusy(false); } }}>
    <label>Your display name <input required maxLength={100} value={name} onChange={e => setName(e.target.value)} /></label>
    <button disabled={busy}>Create client profile</button>{error && <p role="alert">{error}</p>}
  </form>;
}
// All private subscriptions are scoped to the current identity. Changing arguments hides old data immediately.
export function useServiceQuery(reference, args, privateQuery = true) {
  const { client, status, userId } = useServices();
  const enabled = Boolean(client && args !== null && (!privateQuery || status === "ready"));
  const name = reference ? getFunctionName(reference) : "";
  const serialized = JSON.stringify(args);
  const key = `${userId}:${enabled}:${name}:${serialized}`;
  const [state, setState] = useState({ key: "", data: undefined, error: "" });
  useEffect(() => {
    if (!enabled) return;
    const watch = client.watchQuery(reference, JSON.parse(serialized));
    const update = () => { try { setState({ key, data: watch.localQueryResult(), error: "" }); } catch (error) { setState({ key, data: undefined, error: serviceError(error) }); } };
    const unsubscribe = watch.onUpdate(update); update(); return unsubscribe;
  }, [client, enabled, name, serialized, key]);
  return state.key === key ? state : { data: undefined, error: "" };
}
