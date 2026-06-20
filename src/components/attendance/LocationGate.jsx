import { useState } from "react";
import api from "../../lib/api.js";

export function LocationGate({ sessionId, onPassed }) {
  const [status, setStatus] = useState("idle"); // idle | checking | failed
  const [error, setError] = useState(null);

  function checkLocation() {
    setStatus("checking");
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported on this device/browser.");
      setStatus("failed");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const { data } = await api.post(`/attendance/${sessionId}/location`, {
            lat: latitude,
            lng: longitude,
          });
          if (data.passed) {
            onPassed();
          }
        } catch (err) {
          const isHardBlock =
            err.response?.status === 403 &&
            err.response?.data?.gate === "location";
          const msg =
            err.response?.data?.message ||
            err.response?.data?.error ||
            "Location check failed";
          setError(msg);
          setStatus(isHardBlock ? "blocked" : "failed");
        }
      },
      (geoErr) => {
        setError(
          "Could not get your location. Please enable location permissions and try again.",
        );
        setStatus("failed");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="gate-card">
      <h3>Step 1: Verify Location</h3>
      <p>We need to confirm you're physically in the classroom.</p>

      {status === "blocked" && (
        <div className="gate-error">
          <p>{error}</p>
          <p>
            <strong>
              You cannot retry this step. Please contact your lecturer.
            </strong>
          </p>
        </div>
      )}

      {status === "failed" && (
        <div className="gate-error">
          <p>{error}</p>
          <button onClick={checkLocation}>Try Again</button>
        </div>
      )}

      {(status === "idle" || status === "checking") && (
        <button onClick={checkLocation} disabled={status === "checking"}>
          {status === "checking"
            ? "Checking location..."
            : "Verify My Location"}
        </button>
      )}
    </div>
  );
}
