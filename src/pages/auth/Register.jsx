import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";

export function Register() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "lecturer",
    department: "",
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await register(form);
      navigate(user.role === "admin" ? "/admin" : "/lecturer");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
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
            UniAttend <span>University of Ilorin</span>
          </div>
        </div>

        <h2>Create account</h2>
        <p className="auth-sub">For lecturers and administrators only</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full name</label>
            <input
              className="form-input"
              placeholder="Dr. Adebayo Okafor"
              value={form.full_name}
              onChange={(e) => update("full_name", e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="you@unilorin.edu.ng"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select
              className="form-select"
              value={form.role}
              onChange={(e) => update("role", e.target.value)}
            >
              <option value="lecturer">Lecturer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {form.role === "lecturer" && (
            <div className="form-group">
              <label className="form-label">Department</label>
              <input
                className="form-input"
                placeholder="Computer Science"
                value={form.department}
                onChange={(e) => update("department", e.target.value)}
              />
            </div>
          )}
          <button
            className="btn btn-primary btn-full"
            type="submit"
            disabled={loading}
            style={{ marginTop: "0.5rem" }}
          >
            {loading ? "Creating account..." : "Create account"}
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
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
