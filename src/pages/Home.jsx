import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import "./Home.css";

const DASHBOARD_PATH = {
  admin: "/admin",
  lecturer: "/lecturer",
  student: "/student",
};

const STEPS = [
  {
    title: "Get your link",
    desc: "Your lecturer shares a session link or QR code at the start of class.",
  },
  {
    title: "Sign in",
    desc: "First time? Use your email and matric number — your matric number is also your default password.",
  },
  {
    title: "Set up biometrics",
    desc: "Register your face and fingerprint once. It only takes a minute.",
  },
  {
    title: "Mark attendance",
    desc: "Next time, just scan and verify — face, fingerprint and your location are checked instantly.",
  },
];

const FEATURES = [
  {
    title: "Location-locked",
    desc: "Attendance only counts when you're physically inside the radius your lecturer set for the session.",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    title: "Face + fingerprint",
    desc: "Two biometric checks, every time, so no one can sign in on a friend's behalf.",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2a4 4 0 0 0-4 4v3a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4z" />
        <path d="M5 11v1a7 7 0 0 0 14 0v-1" />
        <path d="M12 19v3" />
      </svg>
    ),
  },
  {
    title: "Live sessions",
    desc: "Lecturers open and close attendance windows in real time, right from the session screen.",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>
    ),
  },
];

export function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dashboardPath = DASHBOARD_PATH[user?.role] ?? "/login";

  return (
    <div className="landing">
      {!user && (
        <header className="landing-topbar">
          <div className="landing-topbar-inner">
            <div className="auth-logo landing-logo">
              <div className="auth-logo-dot" />
              <div className="auth-logo-text">
                Attendance
                <span>University System</span>
              </div>
            </div>
            <nav className="landing-topbar-nav">
              <Link to="/login" className="btn btn-ghost btn-sm">
                Login
              </Link>
              <Link to="/register" className="btn btn-outline btn-sm">
                Register
              </Link>
            </nav>
          </div>
        </header>
      )}

      <section className="landing-hero">
        <span className="badge badge-cyan landing-eyebrow">
          Geofenced · Face + Fingerprint Verified
        </span>
        <h1>Attendance you can't fake.</h1>
        <p className="lede">
          Every sign-in checks who you are and where you are — verified face,
          verified fingerprint, verified location — before a single mark hits
          the register.
        </p>
        <div className="landing-cta-row">
          {user ? (
            <button
              className="btn btn-primary"
              onClick={() => navigate(dashboardPath)}
            >
              Go to your dashboard
            </button>
          ) : (
            <>
              <Link to="/register" className="btn btn-primary">
                Get started
              </Link>
              <Link to="/login" className="btn btn-outline">
                I already have an account
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-head">
          <h2>How it works</h2>
          <p>Four steps from class link to verified attendance.</p>
        </div>

        <div className="step-track landing-steps">
          {STEPS.map((step, i) => (
            <div className="landing-step-wrap" key={step.title}>
              <div className="step-node">
                <div className="step-circle active">{i + 1}</div>
                <div className="step-label active">{step.title}</div>
              </div>
              {i < STEPS.length - 1 && <div className="step-line done" />}
            </div>
          ))}
        </div>

        <div className="landing-steps-detail">
          {STEPS.map((step) => (
            <div className="card landing-step-card" key={step.title}>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section landing-features">
        <div className="landing-section-head">
          <h2>Built to stop proxy attendance</h2>
          <p>
            No more "sign in for me" — every check happens on the student's own
            device.
          </p>
        </div>
        <div className="landing-features-grid">
          {FEATURES.map((f) => (
            <div className="card feature-card" key={f.title}>
              <div className="feature-icon">{f.icon}</div>
              <h3 className="card-title">{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        University Attendance System — secured with biometric and location
        verification.
      </footer>
    </div>
  );
}
