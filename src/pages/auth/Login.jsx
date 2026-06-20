import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === "admin") navigate("/admin");
      else if (user.role === "lecturer") navigate("/lecturer");
      else navigate("/student");
    } catch (err) {
      setError(err.response?.data?.error || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-box">
        <div className="auth-logo">
          <div className="auth-logo-dot" />
          <div className="auth-logo-text">
            UniAttend
            <span>University of Ilorin</span>
          </div>
        </div>

        <h2>Welcome back</h2>
        <p className="auth-sub">Sign in to your account to continue</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input
              className="form-input"
              type="email"
              placeholder="you@unilorin.edu.ng"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            className="btn btn-primary btn-full"
            type="submit"
            disabled={loading}
            style={{ marginTop: "0.5rem" }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p
          style={{
            marginTop: "1.5rem",
            fontSize: "0.85rem",
            color: "var(--text-2)",
            textAlign: "center",
          }}
        >
          Need an account? <Link to="/register">Register here</Link>
        </p>
        <p
          style={{
            marginTop: "0.5rem",
            fontSize: "0.8rem",
            color: "var(--text-3)",
            textAlign: "center",
          }}
        >
          Students: your default password is your matric number.
        </p>
      </div>
    </div>
  );
}
