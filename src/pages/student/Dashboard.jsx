import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api.js";
import { Spinner } from "../../components/common/Spinner.jsx";

export function StudentDashboard() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/students/me")
      .then(({ data }) => setProfile(data.student))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="Loading profile..." />;
  if (!profile) return <p>Could not load your profile.</p>;

  const needsSetup =
    !profile.face_registered || !profile.fingerprint_registered;

  return (
    <div className="page">
      <h2>My Dashboard</h2>
      <p>Matric Number: {profile.matric_number}</p>

      {needsSetup && (
        <div className="result-box">
          <p>
            <strong>
              Complete your biometric setup before you can mark attendance.
            </strong>
          </p>
          <ul>
            <li>Face registered: {profile.face_registered ? "Yes" : "No"}</li>
            <li>
              Fingerprint registered:{" "}
              {profile.fingerprint_registered ? "Yes" : "No"}
            </li>
          </ul>
          <Link to="/student/biometric-setup">Complete Setup</Link>
        </div>
      )}

      {!needsSetup && (
        <p>
          Your biometric setup is complete. Scan a QR code from your lecturer to
          mark attendance.
        </p>
      )}
    </div>
  );
}
