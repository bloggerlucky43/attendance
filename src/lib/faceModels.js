// src/lib/faceModels.js
import * as faceapi from "face-api.js";

let loaded = false;
let loading = null;

export async function loadFaceModels() {
  if (loaded) return; // already done, instant return
  if (loading) return loading; // in progress, reuse the same promise

  loading = Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
    faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
    faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
  ]).then(() => {
    loaded = true;
  });

  return loading;
}
