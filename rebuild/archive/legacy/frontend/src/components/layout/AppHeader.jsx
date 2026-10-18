import { NavLink } from "react-router-dom";
import { useAppState } from "../../state/AppContext";
import { useLegalChat } from "../../hooks/useLegalChat";

export default function AppHeader() {
  const { classification } = useAppState();
  const { startNewCase } = useLegalChat({ navigateAfterFirstResult: false });

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <NavLink to="/" className="app-header-brand" end>
          <span className="app-header-logo" aria-hidden="true">
            ⚖
          </span>
          <span>
            <strong>Vakil Setu</strong>
            <small>Legal AI</small>
          </span>
        </NavLink>

        <nav className="app-header-nav" aria-label="Main">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/results">Consultations</NavLink>
          <button type="button" className="app-header-link-btn" onClick={startNewCase}>
            New Case
          </button>
          <NavLink to="/booking" className={classification ? "" : "nav-muted"}>
            Profile
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
