export function Spinner({ label }) {
  return (
    <div style={{ textAlign: "center", padding: "2rem" }}>
      <div className="spinner" />
      {label && <p style={{ marginTop: "0.75rem", color: "#666" }}>{label}</p>}
    </div>
  );
}
