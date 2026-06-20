import { useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import api from "../../lib/api.js";

export function FingerprintGate({ sessionId, onPassed }) {
  const [status, setStatus] = useState("idle"); // idle | verifying | failed
  const [error, setError] = useState(null);

  async function verifyFingerprint() {
    setStatus("verifying");
    setError(null);

    try {
      // 1. Get WebAuthn authentication options from backend
      const { data: options } = await api.get("/webauthn/auth-options");

      // 2. Trigger native device fingerprint/biometric prompt
      const credential = await startAuthentication(options);

      // 3. Send the signed credential back for verification
      const { data: verifyResult } = await api.post("/webauthn/auth-verify", {
        credential,
      });

      if (!verifyResult.verified) {
        setError("Fingerprint verification failed.");
        setStatus("failed");
        return;
      }

      // 4. Finalize attendance record on the backend
      await api.post(`/attendance/${sessionId}/finalize`);

      onPassed();
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.message ||
        "Fingerprint verification failed";
      setError(msg);
      setStatus("failed");
    }
  }

  return (
    <div className="gate-card">
      <h3>Step 3: Fingerprint Verification</h3>
      <p>Use your device's fingerprint sensor to confirm your identity.</p>

      {error && <p className="gate-error">{error}</p>}

      <button onClick={verifyFingerprint} disabled={status === "verifying"}>
        {status === "verifying"
          ? "Waiting for fingerprint..."
          : "Verify Fingerprint"}
      </button>
    </div>
  );
}
