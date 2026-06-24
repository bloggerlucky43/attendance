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

    let settled = false;
    let bestPosition = null; // ← track best fix seen so far
    const ACCURACY_THRESHOLD = 150; // metres — accept fix once accuracy is good enough
    const MAX_WAIT_MS = 10000; // stop waiting after 15s and use best available

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        if (settled) return;

        // Track the most accurate fix seen so far
        if (
          !bestPosition ||
          pos.coords.accuracy < bestPosition.coords.accuracy
        ) {
          bestPosition = pos;
        }

        const accuracyGoodEnough = pos.coords.accuracy <= ACCURACY_THRESHOLD;

        // Only proceed if accuracy is good enough OR we've waited long enough (handled by timeout)
        if (!accuracyGoodEnough) {
          console.log(
            `[Location] accuracy: ${pos.coords.accuracy.toFixed(1)}m — waiting for better fix...`,
          );
          return; // keep watching
        }

        // Good fix — proceed
        settled = true;
        navigator.geolocation.clearWatch(watchId);
        await submitLocation(bestPosition);
      },
      (err) => {
        if (settled) return;
        settled = true;
        navigator.geolocation.clearWatch(watchId);

        const messages = {
          1: "Location access denied. Enable permissions and try again.",
          2: "Location unavailable. Check your device GPS or network.",
          3: "Location timed out. Move to a better signal area and try again.",
        };
        setError(messages[err.code] || "Could not get your location.");
        setStatus("failed");
      },
      {
        enableHighAccuracy: true,
        timeout: MAX_WAIT_MS,
        maximumAge: 0, // ← never use cached fix
      },
    );

    // After MAX_WAIT_MS, use best fix available even if not ideal accuracy
    setTimeout(() => {
      if (settled) return;
      settled = true;
      navigator.geolocation.clearWatch(watchId);

      if (bestPosition) {
        console.log(
          `[Location] timeout — using best fix: ${bestPosition.coords.accuracy.toFixed(1)}m accuracy`,
        );
        submitLocation(bestPosition);
      } else {
        setError(
          "Could not get your location. Please check that location permissions are enabled, then try again.",
        );
        setStatus("failed");
      }
    }, MAX_WAIT_MS);
  }

  async function submitLocation(pos) {
    try {
      console.log(
        `[Location] submitting: lat=${pos.coords.latitude}, lng=${pos.coords.longitude}, accuracy=${pos.coords.accuracy.toFixed(1)}m`,
      );
      const { data } = await api.post(`/attendance/${sessionId}/location`, {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
      if (data.passed) onPassed();
      else {
        setError(
          "You don't appear to be in the classroom. Move closer and try again.",
        );
        setStatus("failed");
      }
    } catch (err) {
      const isHardBlock =
        err.response?.status === 403 && err.response?.data?.gate === "location";
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Location check failed",
      );
      setStatus(isHardBlock ? "blocked" : "failed");
    }
  }

  return (
    <div className="gate-card">
      {/* <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}></div> */}
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
        <>
          <button
            className="btn btn-primary btn-full"
            onClick={check}
            disabled={status === "checking"}
          >
            {status === "checking"
              ? "Getting accurate location..."
              : "Verify Location"}
          </button>
          {status === "checking" && (
            <p
              style={{
                fontSize: "0.78rem",
                color: "var(--text-3)",
                marginTop: "0.5rem",
                textAlign: "center",
              }}
            >
              Waiting for GPS signal — stay still for best results
            </p>
          )}
        </>
      )}
    </div>
  );
}
