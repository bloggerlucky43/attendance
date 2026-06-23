import * as faceapi from "face-api.js";

let loaded = false;
let loading = null;

export async function loadFaceModels() {
  if (loaded) return;
  if (loading) return loading;

  loading = Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri("/models"), // ← MUST be TinyNet
    faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
  ]).then(() => {
    loaded = true;
  });

  return loading;
}
