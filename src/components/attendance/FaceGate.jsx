import { useRef, useState, useEffect } from "react";
import * as faceapi from "face-api.js";
import api from "../../lib/api.js";

const THRESHOLD = 0.5;

export function FaceGate({ sessionId, storedDescriptor, onPassed }) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState("loading"); // loading | ready | scanning | failed
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null); // shows distance so you can tune threshold

  // ── Validate storedDescriptor before doing anything ──────────
  const parsedDescriptor = (() => {
    try {
      if (!storedDescriptor) return null;

      // Supabase returns jsonb as a plain JS object with numeric keys
      // e.g. { "0": 0.123, "1": -0.045, ... } instead of a real array
      // Convert either form to Float32Array
      const raw = Array.isArray(storedDescriptor)
        ? storedDescriptor
        : Object.values(storedDescriptor);

      if (raw.length !== 128) {
        console.error("Descriptor length wrong:", raw.length);
        return null;
      }

      return new Float32Array(raw);
    } catch (e) {
      console.error("Failed to parse descriptor:", e);
      return null;
    }
  })();

  useEffect(() => {
    // If descriptor is invalid, fail early before loading models
    if (!parsedDescriptor) {
      setError(
        "No face descriptor found. Please re-register your face in Biometric Setup.",
      );
      setStatus("failed");
      return;
    }

    async function init() {
      // Models
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
          faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
        ]);
      } catch (err) {
        console.error("Model load error:", err);
        setError("Failed to load face recognition models.");
        setStatus("failed");
        return;
      }

      // Camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
        setStatus("ready");
      } catch (err) {
        console.error("Camera error:", err.name, err.message);
        if (err.name === "NotAllowedError") {
          setError("Camera access denied. Allow camera permission and reload.");
        } else if (err.name === "SecurityError") {
          setError(
            "Camera blocked — page must be served over HTTPS on mobile.",
          );
        } else {
          setError(`Camera error: ${err.message}`);
        }
        setStatus("failed");
      }
    }

    init();
    return () => {
      videoRef.current?.srcObject?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function captureAndVerify() {
    setStatus("scanning");
    setError(null);
    setDebugInfo(null);

    try {
      const det = await faceapi
        .detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions(),
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!det) {
        setError(
          "No face detected. Make sure your face is well-lit and centred.",
        );
        setStatus("ready");
        return;
      }

      // Compute distance between live face and stored descriptor
      const distance = faceapi.euclideanDistance(
        det.descriptor,
        parsedDescriptor,
      );
      const match = distance < THRESHOLD;

      // Show debug info so you can tune the threshold if needed
      console.log(
        `Face distance: ${distance.toFixed(4)} | threshold: ${THRESHOLD} | match: ${match}`,
      );
      setDebugInfo(
        `Confidence: ${((1 - distance) * 100).toFixed(1)}% (threshold ${((1 - THRESHOLD) * 100).toFixed(0)}% min)`,
      );

      if (!match) {
        // Don't even bother hitting the backend if client-side says no match
        setError(
          `Face did not match (distance: ${distance.toFixed(3)}). Try better lighting or re-register your face.`,
        );
        setStatus("ready");
        // Restart camera for retry
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
        return;
      }

      // Stop camera before API call
      videoRef.current?.srcObject?.getTracks().forEach((t) => t.stop());

      const { data } = await api.post(`/attendance/${sessionId}/face`, {
        match,
        distance,
      });

      if (data.passed) {
        onPassed();
      } else {
        setError("Server rejected face verification. Please try again.");
        setStatus("ready");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Face verify error:", err);
      setError(
        err.response?.data?.error || "Verification failed. Please try again.",
      );
      setStatus("ready");
    }
  }

  return (
    <div className="gate-card">
      <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>👤</div>
      <h3>Face Verification</h3>
      <p>Look directly at the camera in good lighting, then tap Verify.</p>

      {status === "loading" && (
        <p style={{ color: "var(--text-2)", fontSize: "0.85rem" }}>
          Loading face recognition models...
        </p>
      )}

      {status !== "failed" && (
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
            style={{ width: "100%", height: 220, objectFit: "cover" }}
          />
        </div>
      )}

      {error && (
        <div className="alert alert-error" style={{ marginBottom: "0.75rem" }}>
          {error}
        </div>
      )}

      {debugInfo && (
        <p
          style={{
            fontSize: "0.75rem",
            color: "var(--text-3)",
            marginBottom: "0.75rem",
          }}
        >
          {debugInfo}
        </p>
      )}

      {status === "ready" && (
        <button className="btn btn-primary btn-full" onClick={captureAndVerify}>
          Verify Face
        </button>
      )}
      {status === "scanning" && (
        <button className="btn btn-primary btn-full" disabled>
          Comparing...
        </button>
      )}
      {status === "failed" && error?.includes("re-register") && (
        <a
          href="/student/biometric-setup"
          className="btn btn-outline btn-full"
          style={{ marginTop: "0.5rem" }}
        >
          Go to Biometric Setup
        </a>
      )}
    </div>
  );
}
