import { Routes, Route } from "react-router-dom";
import AppHeader from "./components/layout/AppHeader";
import HomePage from "./pages/HomePage";
import ChatPage from "./pages/ChatPage";
import ResultsPage from "./pages/ResultsPage";
import BookingPage from "./pages/BookingPage";
import ProfilePage from "./pages/ProfilePage";
import EmergencyButton from "./components/EmergencyButton";

export default function App() {
  return (
    <div className="app-shell">
      <AppHeader />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/booking" element={<BookingPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
      <EmergencyButton />
    </div>
  );
}
