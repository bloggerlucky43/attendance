import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../lib/api.js";
import { LocationGate } from "../../components/attendance/LocationGate.jsx";
import { FaceGate } from "../../components/attendance/FaceGate.jsx";
import { FingerprintGate } from "../../components/attendance/FingerprintGate.jsx";
import { Spinner } from "../../components/common/Spinner.jsx";

const STEPS = { LOCATION: 0, FACE: 1, FINGERPRINT: 2, DONE: 3 };
const STEP_LABELS = ["Location", "Face", "Fingerprint"];

function StepTracker({ step }) {
  return (
    <div className="step-track" style={{ marginBottom: "2rem" }}>
      {STEP_LABELS.map((label, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center" }}>
          <div className="step-node">
            <div
              className={`step-circle ${step === i ? "active" : step > i ? "done" : ""}`}
            >
              {step > i ? "✓" : i + 1}
            </div>
            <div
              className={`step-label ${step === i ? "active" : step > i ? "done" : ""}`}
            >
              {label}
            </div>
          </div>
          {i < STEP_LABELS.length - 1 && (
            <div className={`step-line ${step > i ? "done" : ""}`} />
          )}
        </div>
      ))}
    </div>
  );
}

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
          setError("Complete your biometric setup before marking attendance.");
          return;
        }
        const { data: status } = await api.get(
          `/attendance/${sessionData.session.id}/my-status`,
        );
        if (status.marked) setAlreadyMarked(true);
      } catch (err) {
        setError(err.response?.data?.error || "Could not load session");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [token]);

  if (loading)
    return (
      <div className="gate-wrap">
        <Spinner label="Loading session..." />
      </div>
    );

  if (error)
    return (
      <div className="gate-wrap">
        <div className="gate-card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>⚠️</div>
          <h3 style={{ color: "var(--white)", marginBottom: "0.5rem" }}>
            Cannot Mark Attendance
          </h3>
          <p className="alert alert-error">{error}</p>
          {error.includes("biometric") && (
            <Link
              to="/student/biometric-setup"
              className="btn btn-primary"
              style={{ marginTop: "1rem" }}
            >
              Complete Setup
            </Link>
          )}
        </div>
      </div>
    );

  if (alreadyMarked)
    return (
      <div className="gate-wrap">
        <div className="gate-card">
          <div className="success-wrap">
            <div className="success-icon">✓</div>
            <h3>Already Recorded</h3>
            <p>You've already marked attendance for this session.</p>
          </div>
        </div>
      </div>
    );

  return (
    <div className="gate-wrap">
      {session && (
        <span className="gate-course-tag">
          {session.courses.course_code} — {session.courses.course_name}
        </span>
      )}

      <StepTracker step={step} />

      {step === STEPS.LOCATION && (
        <LocationGate
          sessionId={session?.id}
          onPassed={() => setStep(STEPS.FACE)}
        />
      )}
      {step === STEPS.FACE && (
        <FaceGate
          sessionId={session?.id}
          storedDescriptor={studentProfile?.face_descriptor}
          onPassed={() => setStep(STEPS.FINGERPRINT)}
        />
      )}
      {step === STEPS.FINGERPRINT && (
        <FingerprintGate
          sessionId={session?.id}
          onPassed={() => setStep(STEPS.DONE)}
        />
      )}
      {step === STEPS.DONE && (
        <div className="gate-card">
          <div className="success-wrap">
            <div className="success-icon">✓</div>
            <h3>Attendance Marked!</h3>
            <p>You're checked in. You can close this page.</p>
          </div>
        </div>
      )}
    </div>
  );
}
