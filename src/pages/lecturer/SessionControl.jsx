import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import api from "../../lib/api.js";
import socket from "../../lib/socket.js";

export function SessionControl() {
  const { courseId } = useParams();
  const [session, setSession] = useState(null); // current active session
  const [qrUrl, setQrUrl] = useState(null);
  const [records, setRecords] = useState([]);
  const [history, setHistory] = useState([]); // past sessions with submissions
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true); // initial fetch
  const [copied, setCopied] = useState(false);
  const settledRef = useRef(false);

  // ── On mount: restore active session + load history ──
  useEffect(() => {
    async function fetchSessions() {
      try {
        const { data } = await api.get(
          `/sessions/my-sessions?course_id=${courseId}`,
        );
        const sessions = data.sessions;

        const active = sessions.find((s) => s.status === "active");
        const closed = sessions.filter((s) => s.status === "closed");

        if (active) {
          setSession(active);
          // Reconstruct QR url from token
          setQrUrl(`${window.location.origin}/attend/${active.session_token}`);
          socket.emit("join:session", active.id);

          // Fetch existing records for the restored session
          const { data: recData } = await api.get(
            `/sessions/${active.id}/attendance`,
          );
          setRecords(recData.records || []);
        }

        setHistory(closed);
      } catch (err) {
        console.error("Failed to load sessions:", err);
      } finally {
        setPageLoading(false);
      }
    }

    fetchSessions();
  }, [courseId]);

  // ── Real-time: new attendance record ──
  useEffect(() => {
    if (!session) return;

    socket.on("attendance:marked", (payload) => {
      setRecords((prev) => [payload, ...prev]);
    });

    return () => socket.off("attendance:marked");
  }, [session]);

  async function startSession() {
    setError(null);
    setLoading(true);
    settledRef.current = false;

    if (!navigator.geolocation) {
      setError("Geolocation not supported on this device.");
      setLoading(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        if (settledRef.current) return;
        settledRef.current = true;
        navigator.geolocation.clearWatch(watchId);

        try {
          const { data } = await api.post("/sessions", {
            course_id: courseId,
            classroom_lat: pos.coords.latitude,
            classroom_lng: pos.coords.longitude,
            location_radius_meters: 50,
          });
          setSession(data.session);
          setQrUrl(data.qrUrl);
          setRecords([]);
          socket.emit("join:session", data.session.id);
        } catch (err) {
          setError(err.response?.data?.error || "Failed to start session");
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        if (settledRef.current) return;
        settledRef.current = true;
        navigator.geolocation.clearWatch(watchId);

        const messages = {
          1: "Location access denied. Enable permissions and retry.",
          2: "Location unavailable. Check your device GPS or network.",
          3: "Location timed out. Move to a better signal area and retry.",
        };
        setError(messages[err.code] || "Failed to get location.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 60000 },
    );

    setTimeout(() => {
      if (!settledRef.current) {
        settledRef.current = true;
        navigator.geolocation.clearWatch(watchId);
        setError("Location timed out. Please try again.");
        setLoading(false);
      }
    }, 35000);
  }

  async function endSession() {
    if (!session) return;
    try {
      await api.post(`/sessions/${session.id}/end`);
      const closed = { ...session, status: "closed" };
      setSession(closed);
      // Move to history if it has submissions
      if (records.length > 0) {
        setHistory((prev) => [
          { ...closed, attendance_count: records.length },
          ...prev,
        ]);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to end session");
    }
  }

  async function exportCSV(sessionId) {
    try {
      const res = await api.get(`/sessions/${sessionId}/export`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance_${sessionId.slice(0, 8)}.csv`;
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

  function formatDate(iso) {
    return new Date(iso).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (pageLoading)
    return (
      <div style={{ padding: "2rem" }}>
        <p style={{ color: "var(--text-2)" }}>Loading sessions...</p>
      </div>
    );

  return (
    <div>
      <div className="page-header">
        <h2>Session Control</h2>
        <p>Start an attendance session and share the QR code with your class</p>
      </div>

      {error && (
        <div
          className="alert alert-error"
          style={{ maxWidth: 520, marginBottom: "1rem" }}
        >
          {error}
        </div>
      )}

      {/* ── No active session ── */}
      {!session && (
        <div className="card" style={{ maxWidth: 520, marginBottom: "2rem" }}>
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

      {/* ── Active session ── */}
      {session?.status === "active" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
            maxWidth: 720,
            marginBottom: "2rem",
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
                    {r.student_name || r.matric_number || "Student"} checked in
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Just ended ── */}
      {session?.status === "closed" && (
        <div className="card" style={{ maxWidth: 520, marginBottom: "2rem" }}>
          <div
            className="alert alert-success"
            style={{ marginBottom: "1.25rem" }}
          >
            Session ended. {records.length} student
            {records.length !== 1 ? "s" : ""} attended.
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              className="btn btn-primary"
              onClick={() => exportCSV(session.id)}
            >
              Download CSV
            </button>
            <button
              className="btn btn-outline"
              onClick={() => {
                setSession(null);
                setRecords([]);
              }}
            >
              Start New Session
            </button>
          </div>
        </div>
      )}

      {/* ── Session history ── */}
      {history.length > 0 && (
        <div style={{ maxWidth: 720 }}>
          <h3
            style={{
              marginBottom: "1rem",
              fontSize: "1rem",
              color: "var(--text-1)",
            }}
          >
            Past Sessions
          </h3>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            {history.map((s) => (
              <div
                key={s.id}
                className="card"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "1rem 1.25rem",
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      marginBottom: "0.2rem",
                    }}
                  >
                    {s.courses?.course_code} — {formatDate(s.started_at)}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-2)" }}>
                    {s.attendance_count} student
                    {s.attendance_count !== 1 ? "s" : ""} attended
                    {s.ended_at ? ` · Ended ${formatDate(s.ended_at)}` : ""}
                  </div>
                </div>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => exportCSV(s.id)}
                >
                  Download CSV
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
