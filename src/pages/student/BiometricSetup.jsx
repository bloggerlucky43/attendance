import { useRef, useState, useEffect } from "react";
import * as faceapi from "face-api.js";
import {
  startRegistration,
  browserSupportsWebAuthn,
} from "@simplewebauthn/browser";
import api from "../../lib/api.js";
import { Spinner } from "../../components/common/Spinner.jsx";
import { loadFaceModels } from "../../lib/faceModels.js";

const DETECT_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 160,
  scoreThreshold: 0.4,
});

export function BiometricSetup() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectionLoopRef = useRef(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [videoReady, setVideoReady] = useState(false);
  const [faceStatus, setFaceStatus] = useState("idle");
  const [fpStatus, setFpStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [cameraError, setCameraError] = useState(null);

  useEffect(() => {
    api
      .get("/students/me")
      .then(({ data }) => {
        const s = data.student;
        console.log("[BiometricSetup] profile loaded:", s);
        console.log(
          "[BiometricSetup] face_descriptor present:",
          !!s.face_descriptor,
        );
        if (s.face_registered) setFaceStatus("done");
        if (s.fingerprint_registered) setFpStatus("done");
      })
      .catch((err) =>
        console.error("[BiometricSetup] profile fetch failed:", err),
      )
      .finally(() => setProfileLoading(false));
  }, []);

  useEffect(() => {
    if (profileLoading) return;
    if (faceStatus === "done") return;

    let cancelled = false;

    async function initCamera() {
      console.log("[BiometricSetup] loading face models...");
      try {
        await loadFaceModels();
        setModelsLoaded(true);
        console.log("[BiometricSetup] models loaded ✓");
      } catch (err) {
        console.error("[BiometricSetup] model load failed:", err);
        setCameraError("Failed to load face recognition models.");
        return;
      }

      console.log("[BiometricSetup] requesting camera...");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 320 },
            height: { ideal: 240 },
          },
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        console.log("[BiometricSetup] camera stream acquired ✓");

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadeddata = () => {
            if (!cancelled) {
              console.log(
                "[BiometricSetup] video has frames, readyState:",
                videoRef.current?.readyState,
              );
              setVideoReady(true);
              startDetectionLoop();
            }
          };
        }
      } catch (err) {
        if (cancelled) return;
        console.error("[BiometricSetup] camera error:", err.name, err.message);
        if (err.name === "NotAllowedError") {
          setCameraError(
            "Camera access denied. Allow camera permission and reload.",
          );
        } else if (err.name === "NotFoundError") {
          setCameraError("No camera found on this device.");
        } else if (err.name === "NotReadableError") {
          setCameraError(
            "Camera is in use by another app. Close it and try again.",
          );
        } else if (err.name === "SecurityError") {
          setCameraError(
            "Camera blocked — page must be served over HTTPS on mobile.",
          );
        } else {
          setCameraError(`Camera error: ${err.message}`);
        }
      }
    }

    initCamera();
    return () => {
      cancelled = true;
      if (detectionLoopRef.current) clearTimeout(detectionLoopRef.current);
      if (videoRef.current) videoRef.current.onloadeddata = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [profileLoading]);

  function startDetectionLoop() {
    if (detectionLoopRef.current) clearTimeout(detectionLoopRef.current);
    console.log("[BiometricSetup] detection loop started");

    async function detect() {
      // ← Use DOM readyState — avoids stale closure on videoReady state
      if (!videoRef.current || videoRef.current.readyState < 2) {
        console.log(
          "[BiometricSetup] video not ready yet, readyState:",
          videoRef.current?.readyState,
        );
        detectionLoopRef.current = setTimeout(detect, 500);
        return;
      }

      try {
        const det = await faceapi
          .detectSingleFace(videoRef.current, DETECT_OPTIONS)
          .withFaceLandmarks(true)
          .withFaceDescriptor();

        if (det) {
          console.log(
            "[BiometricSetup] face detected! score:",
            det.detection.score.toFixed(3),
          );
          await captureAndSave(det);
        } else {
          console.log("[BiometricSetup] no face in frame, retrying...");
          detectionLoopRef.current = setTimeout(detect, 300);
        }
      } catch (err) {
        console.error("[BiometricSetup] detection error:", err.message);
        detectionLoopRef.current = setTimeout(detect, 400);
      }
    }

    detect();
  }

  async function captureAndSave(det) {
    if (detectionLoopRef.current) {
      clearTimeout(detectionLoopRef.current);
      detectionLoopRef.current = null;
    }

    setFaceStatus("scanning");
    setError(null);
    console.log(
      "[BiometricSetup] saving descriptor, length:",
      det.descriptor.length,
    );

    try {
      await api.post("/students/face-register", {
        face_descriptor: Array.from(det.descriptor),
      });

      console.log("[BiometricSetup] face registered successfully ✓");
      streamRef.current?.getTracks().forEach((t) => t.stop()); // ← forEach fixed
      setFaceStatus("done");
    } catch (err) {
      console.error("[BiometricSetup] save failed:", err);
      setError(
        err.response?.data?.error ||
          "Face registration failed. Please try again.",
      );
      setFaceStatus("idle");
      startDetectionLoop();
    }
  }

  async function registerFingerprint() {
    if (!browserSupportsWebAuthn()) {
      setError(
        window.isSecureContext
          ? "This browser doesn't support WebAuthn."
          : "WebAuthn requires a secure context (HTTPS).",
      );
      return;
    }
    setFpStatus("scanning");
    setError(null);
    try {
      const { data: opts } = await api.get("/webauthn/register-options");
      const credential = await startRegistration(opts);
      await api.post("/webauthn/register-verify", { credential });
      setFpStatus("done");
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.message ||
          "Fingerprint registration failed",
      );
      setFpStatus("idle");
    }
  }

  const allDone = faceStatus === "done" && fpStatus === "done";

  if (profileLoading)
    return <Spinner label="Checking registration status..." />;

  return (
    <div>
      <div className="page-header">
        <h2>Biometric Setup</h2>
        <p>
          One-time registration. Used to verify your identity when marking
          attendance.
        </p>
      </div>

      {error && (
        <div
          className="alert alert-error"
          style={{ maxWidth: 500, marginBottom: "1rem" }}
        >
          {error}
        </div>
      )}

      {/* ── Step 1: Face ── */}
      <div
        className={`setup-step ${faceStatus === "done" ? "done-step" : "active-step"}`}
        style={{ maxWidth: 500 }}
      >
        <div className="setup-step-num">
          {faceStatus === "done" ? "✓" : "1"}
        </div>
        <div className="setup-step-body">
          <h3>Face Registration</h3>

          {faceStatus === "done" && (
            <>
              <p style={{ color: "var(--text-2)", marginBottom: "0.5rem" }}>
                Already registered from a previous session.
              </p>
              <span className="badge badge-green">✓ Registered</span>
            </>
          )}

          {faceStatus !== "done" && cameraError && (
            <div className="alert alert-error">{cameraError}</div>
          )}

          {/* ← Single clean block, no duplicate video elements */}
          {faceStatus !== "done" && !cameraError && (
            <>
              <p>
                {faceStatus === "scanning"
                  ? "Face detected — saving..."
                  : videoReady
                    ? "👀 Position your face in the frame — it will capture automatically"
                    : "Starting camera..."}
              </p>
              <div
                className="camera-wrap"
                style={{ marginBottom: "0.75rem", position: "relative" }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{ width: "100%", height: 200, objectFit: "cover" }}
                />
                {videoReady && faceStatus === "idle" && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      border: "2px solid var(--primary)",
                      borderRadius: 8,
                      animation: "pulse 1.5s infinite",
                      pointerEvents: "none",
                    }}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Step 2: Fingerprint ── */}
      <div
        className={`setup-step ${fpStatus === "done" ? "done-step" : faceStatus === "done" ? "active-step" : ""}`}
        style={{ maxWidth: 500 }}
      >
        <div className="setup-step-num">{fpStatus === "done" ? "✓" : "2"}</div>
        <div className="setup-step-body">
          <h3>Fingerprint Registration</h3>
          <p>Uses your device's built-in fingerprint sensor or Face ID.</p>

          {fpStatus !== "done" && (
            <>
              <button
                className="btn btn-primary btn-sm"
                onClick={registerFingerprint}
                disabled={faceStatus !== "done" || fpStatus === "scanning"}
              >
                {fpStatus === "scanning"
                  ? "Waiting for fingerprint..."
                  : "Register Fingerprint"}
              </button>
              {faceStatus !== "done" && (
                <p
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--text-3)",
                    marginTop: "0.5rem",
                  }}
                >
                  Complete face registration first
                </p>
              )}
            </>
          )}

          {fpStatus === "done" && (
            <span className="badge badge-green">✓ Registered</span>
          )}
        </div>
      </div>

      {/* ── All done ── */}
      {allDone && (
        <div
          className="card"
          style={{ maxWidth: 500, borderColor: "rgba(16,185,129,0.3)" }}
        >
          <div className="success-wrap" style={{ padding: "1rem" }}>
            <div className="success-icon">✓</div>
            <h3>You're all set!</h3>
            <p>
              Biometric setup complete. Scan your lecturer's QR code to mark
              attendance.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
