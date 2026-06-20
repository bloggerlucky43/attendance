import { useState } from "react";
import api from "../../lib/api.js";

export function LocationGate({ sessionId, onPassed }) {
  const [status, setStatus] = useState("idle"); // idle | checking | failed | blocked
  const [error, setError] = useState(null);

  function check() {
    setStatus("checking");
    setError(null);
    if (!navigator.geolocation) {
      setError("Geolocation is not supported on this device.");
      setStatus("failed");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { data } = await api.post(`/attendance/${sessionId}/location`, {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          if (data.passed) onPassed();
        } catch (err) {
          const isHardBlock =
            err.response?.status === 403 &&
            err.response?.data?.gate === "location";
          setError(
            err.response?.data?.message ||
              err.response?.data?.error ||
              "Location check failed",
          );
          setStatus(isHardBlock ? "blocked" : "failed");
        }
      },
      () => {
        setError(
          "Could not get your location. Enable location permissions and try again.",
        );
        setStatus("failed");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="gate-card">
      <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>📍</div>
      <h3>Location Check</h3>
      <p>Confirm you're physically in the classroom.</p>

      {status === "blocked" && (
        <div className="alert alert-error">
          {error}
          <br />
          <strong>This is a hard block — contact your lecturer.</strong>
        </div>
      )}
      {status === "failed" && (
        <>
          <div className="alert alert-error">{error}</div>
          <button className="btn btn-outline btn-full" onClick={check}>
            Try Again
          </button>
        </>
      )}
      {(status === "idle" || status === "checking") && (
        <button
          className="btn btn-primary btn-full"
          onClick={check}
          disabled={status === "checking"}
        >
          {status === "checking" ? "Checking location..." : "Verify Location"}
        </button>
      )}
    </div>
  );
}
