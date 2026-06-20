export function Spinner({ label }) {
  return (
    <div className="spinner-wrap">
      <div className="spinner" />
      {label && <p className="spinner-label">{label}</p>}
    </div>
  );
}
