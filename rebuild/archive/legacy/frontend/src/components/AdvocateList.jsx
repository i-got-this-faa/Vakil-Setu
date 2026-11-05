import AdvocateCard from "./AdvocateCard";

export default function AdvocateList({ advocates, onSelect, lang = "en" }) {
  const hi = lang === "hi";
  const L = hi
    ? {
        title: "मेल खाने वाले वकील",
        subtitle: "आपके मामले के अनुसार अनुभवी वकील",
        empty: "इस श्रेणी के लिए अभी कोई वकील उपलब्ध नहीं है।"
      }
    : {
        title: "Matched advocates",
        subtitle: "Experienced lawyers aligned with your case type",
        empty: "No advocates available for this practice area right now."
      };

  return (
    <section className="advocates-panel animate-in">
      <header className="advocates-panel-head">
        <div>
          <h2 className="advocates-panel-title">{L.title}</h2>
          <p className="advocates-panel-sub">{L.subtitle}</p>
        </div>
        {advocates.length > 0 ? (
          <span className="advocates-count">
            {advocates.length} {hi ? "उपलब्ध" : "available"}
          </span>
        ) : null}
      </header>

      {advocates.length === 0 ? (
        <p className="advocates-empty">{L.empty}</p>
      ) : (
        <div className="advocates-grid" role="list">
          {advocates.map((advocate, index) => (
            <AdvocateCard
              key={advocate._id}
              advocate={advocate}
              onSelect={onSelect}
              lang={lang}
              index={index}
            />
          ))}
        </div>
      )}
    </section>
  );
}
