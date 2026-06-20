import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import api from "../../lib/api.js";
import socket from "../../lib/socket.js";

export function SessionControl() {
  const { courseId } = useParams();
  const [session, setSession] = useState(null);
  const [qrUrl, setQrUrl] = useState(null);
  const [records, setRecords] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function startSession() {
    setError(null);
    setLoading(true);

    if (!navigator.geolocation) {
      setError("Geolocation not supported on this device.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const { data } = await api.post("/sessions", {
            course_id: courseId,
            classroom_lat: latitude,
            classroom_lng: longitude,
            location_radius_meters: 50,
          });
          setSession(data.session);
          setQrUrl(data.qrUrl);
          socket.emit("join:session", data.session.id);
        } catch (err) {
          setError(err.response?.data?.error || "Failed to start session");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError("Could not get your location. Enable location permissions.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function endSession() {
    if (!session) return;
    try {
      await api.post(`/sessions/${session.id}/end`);
      setSession((s) => ({ ...s, status: "closed" }));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to end session");
    }
  }

  function exportCSV() {
    if (!session) return;
    window.open(
      `${import.meta.env.VITE_API_URL}/sessions/${session.id}/export?token=${localStorage.getItem("token")}`,
      "_blank",
    );
  }

  useEffect(() => {
    if (!session) return;

    function handleNewRecord(payload) {
      setRecords((prev) => [payload, ...prev]);
    }

    socket.on("attendance:marked", handleNewRecord);
    return () => socket.off("attendance:marked", handleNewRecord);
  }, [session]);

  return (
    <div className="page">
      <h2>Session Control</h2>

      {error && <p className="gate-error">{error}</p>}

      {!session && (
        <button onClick={startSession} disabled={loading}>
          {loading ? "Starting..." : "Start Session"}
        </button>
      )}

      {session && session.status === "active" && (
        <>
          <p>
            Session is live. Students can scan the QR below or use the link.
          </p>
          <QRCodeSVG value={qrUrl} size={240} />
          <p>
            <a href={qrUrl} target="_blank" rel="noreferrer">
              {qrUrl}
            </a>
          </p>

          <button onClick={endSession}>End Session</button>

          <h3>Live Attendance ({records.length})</h3>
          <ul>
            {records.map((r, i) => (
              <li key={i}>Student ID: {r.studentId}</li>
            ))}
          </ul>
        </>
      )}

      {session && session.status === "closed" && (
        <>
          <p>Session ended.</p>
          <button onClick={exportCSV}>Export Attendance CSV</button>
        </>
      )}
    </div>
  );
}
