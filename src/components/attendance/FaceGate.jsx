import { useRef, useState, useEffect } from "react";
import * as faceapi from "face-api.js";
import api from "../../lib/api.js";

const MATCH_THRESHOLD = 0.5; // lower = stricter. face-api.js convention.

export function FaceGate({ sessionId, storedDescriptor, onPassed }) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState("loading"); // loading | ready | scanning | failed
  const [error, setError] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  useEffect(() => {
    async function loadModels() {
      const MODEL_URL = "/models"; // place face-api.js weight files in /public/models
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      setModelsLoaded(true);
      setStatus("ready");
    }
    loadModels().catch(() => {
      setError("Failed to load face recognition models.");
      setStatus("failed");
    });
  }, []);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
      videoRef.current.srcObject = stream;
    } catch {
      setError("Could not access camera. Please allow camera permissions.");
      setStatus("failed");
    }
  }

  async function captureAndCompare() {
    setStatus("scanning");
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
        setError("No face detected. Make sure your face is clearly visible.");
        setStatus("ready");
        return;
      }

      const liveDescriptor = detection.descriptor;
      const stored = new Float32Array(storedDescriptor);
      const distance = faceapi.euclideanDistance(liveDescriptor, stored);
      const match = distance < MATCH_THRESHOLD;

      // Stop camera stream
      const stream = videoRef.current.srcObject;
      stream?.getTracks().forEach((track) => track.stop());

      const { data } = await api.post(`/attendance/${sessionId}/face`, {
        match,
        distance,
      });

      if (data.passed) {
        onPassed();
      } else {
        setError("Face did not match. Please try again.");
        setStatus("ready");
        startCamera();
      }
    } catch (err) {
      const msg = err.response?.data?.error || "Face verification failed";
      setError(msg);
      setStatus("ready");
    }
  }

  useEffect(() => {
    if (modelsLoaded) startCamera();
    return () => {
      const stream = videoRef.current?.srcObject;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [modelsLoaded]);

  return (
    <div className="gate-card">
      <h3>Step 2: Face Verification</h3>
      <p>Look directly at the camera.</p>

      {status === "loading" && <p>Loading face recognition models...</p>}

      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        width="320"
        height="240"
      />

      {error && <p className="gate-error">{error}</p>}

      {status === "ready" && (
        <button onClick={captureAndCompare}>Capture & Verify</button>
      )}
      {status === "scanning" && <p>Verifying...</p>}
    </div>
  );
}
