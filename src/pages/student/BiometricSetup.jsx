// error received was that the first argument must be of type string or an isntance of buffer,Array Butter or Array or an arraylike object, Received undefined
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
  inputSize: 224,
  scoreThreshold: 0.5,
});

export function BiometricSetup() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [videoReady, setVideoReady] = useState(false);

  // Initialise from DB — face may already be registered
  const [faceStatus, setFaceStatus] = useState("idle"); // idle | scanning | done
  const [fpStatus, setFpStatus] = useState("idle"); // idle | scanning | done

  const [error, setError] = useState(null);
  const [cameraError, setCameraError] = useState(null);

  // ── Step 1: fetch existing registration status from backend ──
  useEffect(() => {
    api
      .get("/students/me")
      .then(({ data }) => {
        const s = data.student;
        if (s.face_registered) setFaceStatus("done");
        if (s.fingerprint_registered) setFpStatus("done");
      })
      .catch(() => {}) // non-fatal
      .finally(() => setProfileLoading(false));
  }, []);

  // ── Step 2: only load models + camera if face NOT already done ──
  useEffect(() => {
    if (profileLoading) return; // wait until we know face status
    if (faceStatus === "done") return; // face already registered — skip camera entirely

    let cancelled = false;

    async function initCamera() {
      // Load models
      try {
        await loadFaceModels();
        setModelsLoaded(true);
      } catch (err) {
        console.error("Model load error:", err);
        setCameraError(
          "Failed to load face recognition models. Make sure model files are in /public/models/.",
        );
        return;
      }

      // Start camera — separate try so model errors don't hide camera errors
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadeddata = () => {
            if (!cancelled) setVideoReady(true);
          };
        }
      } catch (err) {
        console.error("Camera error:", err.name, err.message);
        if (err.name === "NotAllowedError") {
          setCameraError(
            "Camera access denied. Allow camera permission in your browser settings and reload.",
          );
        } else if (err.name === "NotFoundError") {
          setCameraError("No camera found on this device.");
        } else if (err.name === "NotReadableError") {
          setCameraError(
            "Camera is in use by another app. Close it and try again.",
          );
        } else if (err.name === "SecurityError") {
          setCameraError(
            "Camera blocked — the page must be served over HTTPS on mobile. Ask your admin to enable HTTPS.",
          );
        } else {
          setCameraError(`Camera error: ${err.message}`);
        }
      }
    }

    initCamera();
    return () => {
      cancelled = true;
      if (videoRef.current) {
        videoRef.current.onloadeddata = null;
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [profileLoading]);

  async function registerFace() {
    if (!videoRef.current || !videoReady) {
      setError("Camera not ready yet. Wait a moment and try again.");

      return;
    }
    setFaceStatus("scanning");
    setError(null);

    try {
      const det = await faceapi
        .detectSingleFace(videoRef.current, DETECT_OPTIONS)
        .withFaceLandmarks(true)
        .withFaceDescriptor();

      if (!det) {
        setError(
          "No face detected. Centre your face in the frame and try again.",
        );
        setFaceStatus("idle");
        return;
      }

      await api.post("/students/face-register", {
        face_descriptor: Array.from(det.descriptor),
      });

      videoRef.current?.srcObject?.getTracks().forEach((t) => t.stop());
      setFaceStatus("done");
    } catch (err) {
      setError(err.response?.data?.error || "Face registration failed");
      setFaceStatus("idle");
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

  const captureReady = modelsLoaded && videoReady;
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

          {faceStatus !== "done" && !cameraError && (
            <>
              <p>
                Position your face in the frame and click capture. Good lighting
                helps accuracy.
              </p>
              <div className="camera-wrap" style={{ marginBottom: "0.75rem" }}>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{ width: "100%", height: 200, objectFit: "cover" }}
                />
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={registerFace}
                disabled={!captureReady || faceStatus === "scanning"}
              >
                {faceStatus === "scanning"
                  ? "Capturing..."
                  : captureReady
                    ? "Capture Face"
                    : "Loading models..."}
              </button>
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
          <p>
            Uses your device's built-in fingerprint sensor or Face ID. Works on
            most modern phones and laptops.
          </p>

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
