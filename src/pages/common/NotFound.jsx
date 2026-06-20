import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="gate-wrap">
      <div className="gate-card" style={{ textAlign: "center" }}>
        <h3 style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>404</h3>
        <p>This page doesn't exist, or you don't have access to it.</p>
        <Link to="/" className="btn btn-primary btn-full">
          Back to home
        </Link>
      </div>
    </div>
  );
}
