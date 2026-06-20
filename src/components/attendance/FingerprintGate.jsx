import { useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import api from "../../lib/api.js";

export function FingerprintGate({ sessionId, onPassed }) {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  async function verify() {
    setStatus("verifying");
    setError(null);
    try {
      const { data: opts } = await api.get("/webauthn/auth-options");
      const credential = await startAuthentication(opts);
      const { data: result } = await api.post("/webauthn/auth-verify", {
        credential,
      });
      if (!result.verified) {
        setError("Fingerprint not recognised. Try again.");
        setStatus("idle");
        return;
      }
      await api.post(`/attendance/${sessionId}/finalize`);
      onPassed();
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.message ||
          "Fingerprint verification failed",
      );
      setStatus("idle");
    }
  }

  return (
    <div className="gate-card">
      <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🫆</div>
      <h3>Fingerprint Verification</h3>
      <p>Use your device's fingerprint sensor to confirm your identity.</p>
      {error && <div className="alert alert-error">{error}</div>}
      <button
        className="btn btn-primary btn-full"
        onClick={verify}
        disabled={status === "verifying"}
      >
        {status === "verifying"
          ? "Waiting for fingerprint..."
          : "Verify Fingerprint"}
      </button>
    </div>
  );
}
