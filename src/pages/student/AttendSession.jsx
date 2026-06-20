import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../../lib/api.js";
import { LocationGate } from "../../components/attendance/LocationGate.jsx";
import { FaceGate } from "../../components/attendance/FaceGate.jsx";
import { FingerprintGate } from "../../components/attendance/FingerprintGate.jsx";
import { Spinner } from "../../components/common/Spinner.jsx";

const STEPS = { LOCATION: 0, FACE: 1, FINGERPRINT: 2, DONE: 3 };

export function AttendSession() {
  const { token } = useParams();
  const [session, setSession] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [step, setStep] = useState(STEPS.LOCATION);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alreadyMarked, setAlreadyMarked] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const { data: sessionData } = await api.get(
          `/sessions/validate/${token}`,
        );
        setSession(sessionData.session);

        const { data: profileData } = await api.get("/students/me");
        setStudentProfile(profileData.student);

        if (
          !profileData.student.face_registered ||
          !profileData.student.fingerprint_registered
        ) {
          setError(
            "You must complete biometric setup before marking attendance.",
          );
          setLoading(false);
          return;
        }

        const { data: statusData } = await api.get(
          `/attendance/${sessionData.session.id}/my-status`,
        );
        if (statusData.marked) {
          setAlreadyMarked(true);
        }
      } catch (err) {
        setError(err.response?.data?.error || "Could not load session");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [token]);

  if (loading) return <Spinner label="Loading session..." />;
  if (error)
    return (
      <div className="page">
        <p className="gate-error">{error}</p>
      </div>
    );
  if (alreadyMarked)
    return (
      <div className="page">
        <p>You've already marked attendance for this session. ✅</p>
      </div>
    );
  if (!session) return null;

  return (
    <div className="page">
      <h2>
        {session.courses.course_code} — {session.courses.course_name}
      </h2>

      <div className="step-indicator">Step {step + 1} of 3</div>

      {step === STEPS.LOCATION && (
        <LocationGate
          sessionId={session.id}
          onPassed={() => setStep(STEPS.FACE)}
        />
      )}

      {step === STEPS.FACE && (
        <FaceGate
          sessionId={session.id}
          storedDescriptor={studentProfile.face_descriptor}
          onPassed={() => setStep(STEPS.FINGERPRINT)}
        />
      )}

      {step === STEPS.FINGERPRINT && (
        <FingerprintGate
          sessionId={session.id}
          onPassed={() => setStep(STEPS.DONE)}
        />
      )}

      {step === STEPS.DONE && (
        <div className="gate-card">
          <h3>Attendance Marked!</h3>
          <p>You're all set. You can close this page.</p>
        </div>
      )}
    </div>
  );
}
