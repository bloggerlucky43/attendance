import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import api from "../../lib/api.js";
import { Spinner } from "../../components/common/Spinner.jsx";

export function StudentDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/students/me")
      .then(({ data }) => setProfile(data.student))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="Loading profile..." />;
  if (!profile)
    return (
      <div className="alert alert-error">Could not load your profile.</div>
    );

  const faceOk = !!profile.face_registered;
  const fpOk = !!profile.fingerprint_registered;
  const allSet = faceOk && fpOk;

  return (
    <div>
      <div className="page-header">
        <h2>Welcome, {user.full_name.split(" ")[0]}</h2>
        <p>Matric: {profile.matric_number}</p>
      </div>

      <div className="stat-grid" style={{ marginBottom: "1.5rem" }}>
        <div className="stat-card">
          <div className="stat-label">Face Scan</div>
          <div style={{ marginTop: "0.5rem" }}>
            <span className={`badge ${faceOk ? "badge-green" : "badge-red"}`}>
              {faceOk ? "✓ Registered" : "✗ Not set up"}
            </span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Fingerprint</div>
          <div style={{ marginTop: "0.5rem" }}>
            <span className={`badge ${fpOk ? "badge-green" : "badge-red"}`}>
              {fpOk ? "✓ Registered" : "✗ Not set up"}
            </span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Status</div>
          <div style={{ marginTop: "0.5rem" }}>
            <span className={`badge ${allSet ? "badge-green" : "badge-amber"}`}>
              {allSet ? "Ready" : "Setup needed"}
            </span>
          </div>
        </div>
      </div>

      {!allSet && (
        <div className="card" style={{ borderColor: "rgba(245,158,11,0.3)" }}>
          <div className="alert alert-warning" style={{ marginBottom: "1rem" }}>
            Complete your biometric setup before you can mark attendance.
          </div>
          <Link to="/student/biometric-setup" className="btn btn-primary">
            Complete Setup →
          </Link>
        </div>
      )}

      {allSet && (
        <div className="card">
          <div className="card-title">Ready to attend</div>
          <p
            style={{
              color: "var(--text-2)",
              fontSize: "0.9rem",
              margin: "0.4rem 0 1rem",
            }}
          >
            Ask your lecturer for the QR code or session link, then scan it to
            begin.
          </p>
          <div className="alert alert-info">
            Your phone camera app can scan the QR code — no special app needed.
          </div>
        </div>
      )}
    </div>
  );
}
