import { Link } from "react-router-dom";
import SummaryEditor from "../components/SummaryEditor";
import AdvocateDirectory from "../components/AdvocateDirectory";
export default function ResultsPage() {
  return <main className="dashboard-page"><div className="dashboard-page-inner"><section className="hero compact"><p className="eyebrow">Your case workspace</p><h1>Summary & advocates</h1><Link to="/chat">Back to avatar chat</Link></section><div className="dashboard-split"><SummaryEditor /><AdvocateDirectory /></div></div></main>;
}
