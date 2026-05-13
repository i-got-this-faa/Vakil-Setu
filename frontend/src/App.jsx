import { Routes, Route } from "react-router-dom";
import { Link } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ResultsPage from "./pages/ResultsPage";
import BookingPage from "./pages/BookingPage";
import EmergencyButton from "./components/EmergencyButton";

export default function App() {
  return (
    <div className="app-shell">
      <header className="top-nav">
        <div className="brand">Vakil Setu</div>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/results">Results</Link>
          <Link to="/booking">Booking</Link>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/booking" element={<BookingPage />} />
      </Routes>
      <EmergencyButton />
    </div>
  );
}
