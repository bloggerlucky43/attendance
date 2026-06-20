import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const adminLinks = [
    { to: "/admin", label: "Dashboard" },
    { to: "/admin/upload-students", label: "Upload Students" },
  ];

  const lecturerLinks = [{ to: "/lecturer", label: "My Courses" }];

  const studentLinks = [
    { to: "/student", label: "Dashboard" },
    { to: "/student/biometric-setup", label: "Biometric Setup" },
  ];

  const links =
    user.role === "admin"
      ? adminLinks
      : user.role === "lecturer"
        ? lecturerLinks
        : studentLinks;

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-dot" />
        <div>
          <div>UniAttend</div>
          <div
            style={{
              fontSize: "0.7rem",
              color: "var(--text-3)",
              fontWeight: 400,
            }}
          >
            Biometric System
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div className="sidebar-label">Navigation</div>
        {links.map((l) => (
          <div key={l.to} className="sidebar-section">
            <NavLink
              to={l.to}
              end
              className={({ isActive }) =>
                "sidebar-link" + (isActive ? " active" : "")
              }
            >
              {l.label}
            </NavLink>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <strong>{user.full_name}</strong>
          <span className="role-badge">{user.role}</span>
        </div>
        <button
          className="btn btn-ghost btn-full btn-sm"
          onClick={handleLogout}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
