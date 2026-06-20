import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";

// Note: this is for admin/lecturer self-registration.
// Students are created via CSV bulk-upload by admin, not self-registration.
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

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

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
    <div className="auth-page">
      <h2>Register</h2>
      <form onSubmit={handleSubmit}>
        <input
          placeholder="Full Name"
          value={form.full_name}
          onChange={(e) => update("full_name", e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
          required
        />
        <select
          value={form.role}
          onChange={(e) => update("role", e.target.value)}
        >
          <option value="lecturer">Lecturer</option>
          <option value="admin">Admin</option>
        </select>
        {form.role === "lecturer" && (
          <input
            placeholder="Department"
            value={form.department}
            onChange={(e) => update("department", e.target.value)}
          />
        )}
        {error && <p className="gate-error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? "Registering..." : "Register"}
        </button>
      </form>
    </div>
  );
}
