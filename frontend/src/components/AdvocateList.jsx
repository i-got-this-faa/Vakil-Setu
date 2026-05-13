export default function AdvocateList({ advocates, onSelect }) {
  return (
    <div className="card animate-in">
      <h3>Matched Advocates</h3>
      {advocates.length === 0 ? (
        <p className="muted">No advocates found for this domain.</p>
      ) : (
        advocates.map((advocate) => (
          <div key={advocate._id} className="advocate-item">
            <div>
              <strong>{advocate.name}</strong>
              <p className="muted">
                Expertise: {advocate.expertise.join(", ")} | Rating: {advocate.rating} | Exp:{" "}
                {advocate.experienceYears} years
              </p>
            </div>
            <button onClick={() => onSelect(advocate)}>Book</button>
          </div>
        ))
      )}
    </div>
  );
}
