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
  const [copied, setCopied] = useState(false);

  async function startSession() {
    setError(null);
    setLoading(true);
    if (!navigator.geolocation) {
      setError("Geolocation not supported on this device.");
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { data } = await api.post("/sessions", {
            course_id: courseId,
            classroom_lat: pos.coords.latitude,
            classroom_lng: pos.coords.longitude,
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
      (err) => {
        const messages = {
          1: "Location access denied. Enable permissions and retry",
          2: "Location unavailable. Check your device GPS or network",
          3: "Location timed out. Move to a better signal area and retry",
        };
        setError(messages[err.code] || "Failed to get location");
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 30000 },
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

  async function exportCSV() {
    if (!session) return;
    try {
      const res = await api.get(`/sessions/${session.id}/export`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance_${session.id.slice(0, 8)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError("Export failed");
    }
  }

  async function copyLink() {
    if (!qrUrl) return;
    await navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  useEffect(() => {
    if (!session) return;
    socket.on("attendance:marked", (payload) => {
      setRecords((prev) => [payload, ...prev]);
    });
    return () => socket.off("attendance:marked");
  }, [session]);

  return (
    <div>
      <div className="page-header">
        <h2>Session Control</h2>
        <p>Start an attendance session and share the QR code with your class</p>
      </div>

      {error && (
        <div className="alert alert-error" style={{ maxWidth: 520 }}>
          {error}
        </div>
      )}

      {!session && (
        <div className="card" style={{ maxWidth: 520 }}>
          <p
            style={{
              color: "var(--text-2)",
              marginBottom: "1.25rem",
              fontSize: "0.9rem",
            }}
          >
            Your current location will be used as the classroom coordinates.
            Students must be within <strong>50 metres</strong> to mark
            attendance.
          </p>
          <button
            className="btn btn-primary btn-full"
            onClick={startSession}
            disabled={loading}
          >
            {loading ? "Getting location..." : "Start Attendance Session"}
          </button>
        </div>
      )}

      {session?.status === "active" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
            maxWidth: 720,
          }}
        >
          <div className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <div className="card-title">QR Code</div>
              <span className="live-badge">
                <span className="live-dot" />
                Live
              </span>
            </div>
            <div className="qr-wrap">
              <div className="qr-inner">
                <QRCodeSVG value={qrUrl} size={180} />
              </div>
              <p>Students scan this to mark attendance</p>
            </div>
            <div className="url-row">
              <span>{qrUrl}</span>
              <button className="btn btn-outline btn-sm" onClick={copyLink}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <button
              className="btn btn-danger btn-full"
              style={{ marginTop: "1rem" }}
              onClick={endSession}
            >
              End Session
            </button>
          </div>

          <div className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <div className="card-title">Live Attendance</div>
              <span className="badge badge-cyan">{records.length} marked</span>
            </div>
            {records.length === 0 ? (
              <div className="empty-state" style={{ padding: "2rem 1rem" }}>
                <p>Waiting for students...</p>
              </div>
            ) : (
              <div style={{ maxHeight: 300, overflowY: "auto" }}>
                {records.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "0.6rem 0",
                      borderBottom: "1px solid var(--border)",
                      fontSize: "0.85rem",
                      color: "var(--text-2)",
                    }}
                  >
                    Student checked in
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {session?.status === "closed" && (
        <div className="card" style={{ maxWidth: 520 }}>
          <div
            className="alert alert-success"
            style={{ marginBottom: "1.25rem" }}
          >
            Session ended. {records.length} student
            {records.length !== 1 ? "s" : ""} attended.
          </div>
          <button className="btn btn-primary" onClick={exportCSV}>
            Download CSV Report
          </button>
        </div>
      )}
    </div>
  );
}
