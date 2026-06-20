import { useRef, useState, useEffect } from "react";
import * as faceapi from "face-api.js";
import { startRegistration } from "@simplewebauthn/browser";
import api from "../../lib/api.js";

export function BiometricSetup() {
  const videoRef = useRef(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceStatus, setFaceStatus] = useState("idle"); // idle | scanning | done | error
  const [fingerprintStatus, setFingerprintStatus] = useState("idle");
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadModels() {
      const MODEL_URL = "/models";
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      setModelsLoaded(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
      videoRef.current.srcObject = stream;
    }
    loadModels().catch(() => setError("Failed to load camera/models"));

    return () => {
      const stream = videoRef.current?.srcObject;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function registerFace() {
    setFaceStatus("scanning");
    setError(null);
    try {
      const detection = await faceapi
        .detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions(),
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setError(
          "No face detected. Make sure your face is clearly visible and try again.",
        );
        setFaceStatus("idle");
        return;
      }

      const descriptorArray = Array.from(detection.descriptor);
      await api.post("/students/face-register", {
        face_descriptor: descriptorArray,
      });

      setFaceStatus("done");
      const stream = videoRef.current.srcObject;
      stream?.getTracks().forEach((t) => t.stop());
    } catch (err) {
      setError(err.response?.data?.error || "Face registration failed");
      setFaceStatus("idle");
    }
  }

  async function registerFingerprint() {
    setFingerprintStatus("scanning");
    setError(null);
    try {
      const { data: options } = await api.get("/webauthn/register-options");
      const credential = await startRegistration(options);
      await api.post("/webauthn/register-verify", { credential });
      setFingerprintStatus("done");
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.message ||
          "Fingerprint registration failed",
      );
      setFingerprintStatus("idle");
    }
  }

  return (
    <div className="page">
      <h2>Biometric Setup</h2>
      <p>This is a one-time setup. You'll use these to mark attendance.</p>

      {error && <p className="gate-error">{error}</p>}

      <div className="gate-card">
        <h3>1. Face Registration</h3>
        {faceStatus !== "done" && (
          <>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              width="320"
              height="240"
            />
            <br />
            <button
              onClick={registerFace}
              disabled={!modelsLoaded || faceStatus === "scanning"}
            >
              {faceStatus === "scanning" ? "Capturing..." : "Capture Face"}
            </button>
          </>
        )}
        {faceStatus === "done" && <p>✅ Face registered successfully.</p>}
      </div>

      <div className="gate-card">
        <h3>2. Fingerprint Registration</h3>
        <p>You'll be prompted to use your device's fingerprint sensor.</p>
        {fingerprintStatus !== "done" && (
          <button
            onClick={registerFingerprint}
            disabled={fingerprintStatus === "scanning"}
          >
            {fingerprintStatus === "scanning"
              ? "Waiting for fingerprint..."
              : "Register Fingerprint"}
          </button>
        )}
        {fingerprintStatus === "done" && (
          <p>✅ Fingerprint registered successfully.</p>
        )}
      </div>

      {faceStatus === "done" && fingerprintStatus === "done" && (
        <p>
          <strong>Setup complete! You can now mark attendance.</strong>
        </p>
      )}
    </div>
  );
}
