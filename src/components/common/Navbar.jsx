import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  if (!user) return null;

  return (
    <nav
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "1rem",
        borderBottom: "1px solid #eee",
      }}
    >
      <div style={{ display: "flex", gap: "1rem" }}>
        <Link to="/">Home</Link>
        {user.role === "admin" && <Link to="/admin">Admin</Link>}
        {user.role === "lecturer" && <Link to="/lecturer">Dashboard</Link>}
        {user.role === "student" && <Link to="/student">Dashboard</Link>}
      </div>
      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <span>
          {user.full_name} ({user.role})
        </span>
        <button onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}
