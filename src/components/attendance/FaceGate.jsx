import { useRef, useState, useEffect } from "react";
import * as faceapi from "face-api.js";
import api from "../../lib/api.js";
import { loadFaceModels } from "../../lib/faceModels.js";

const THRESHOLD = 0.5;

export function FaceGate({ sessionId, storedDescriptor, onPassed }) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);
  const [modelsReady, setModelsReady] = useState(false);

  useEffect(() => {
    async function init() {
      await loadFaceModels();
      setModelsReady(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setStatus("ready");
    }
    init().catch(() => {
      setError("Failed to load camera or models.");
      setStatus("failed");
    });
    return () => {
      videoRef.current?.srcObject?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function captureAndVerify() {
    setStatus("scanning");
    setError(null);
    try {
      const det = await faceapi
        .detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions(),
        )
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (!det) {
        setError("No face detected. Make sure your face is visible.");
        setStatus("ready");
        return;
      }

      const distance = faceapi.euclideanDistance(
        det.descriptor,
        new Float32Array(storedDescriptor),
      );
      const match = distance < THRESHOLD;

      videoRef.current?.srcObject?.getTracks().forEach((t) => t.stop());
      const { data } = await api.post(`/attendance/${sessionId}/face`, {
        match,
        distance,
      });

      if (data.passed) {
        onPassed();
      } else {
        setError("Face did not match. Please try again.");
        setStatus("ready");
        const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
        if (videoRef.current) videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError(err.response?.data?.error || "Verification failed");
      setStatus("ready");
    }
  }

  return (
    <div className="gate-card">
      <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>👤</div>
      <h3>Face Verification</h3>
      <p>Look directly at the camera, then tap the button.</p>

      {status === "loading" && (
        <p style={{ color: "var(--text-2)", fontSize: "0.85rem" }}>
          Loading face recognition...
        </p>
      )}

      <div
        className="camera-wrap"
        style={{
          display: status === "loading" ? "none" : "block",
          marginBottom: "0.75rem",
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{ width: "100%", height: 200, objectFit: "cover" }}
        />
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {status === "ready" && (
        <button className="btn btn-primary btn-full" onClick={captureAndVerify}>
          Verify Face
        </button>
      )}
      {status === "scanning" && (
        <button className="btn btn-primary btn-full" disabled>
          Comparing face...
        </button>
      )}
    </div>
  );
}
