import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";

export function AdminDashboard() {
  const { user } = useAuth();
  return (
    <div>
      <div className="page-header">
        <h2>Admin Dashboard</h2>
        <p>Manage students, courses, and system settings</p>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">System</div>
          <div
            className="stat-value"
            style={{
              color: "var(--cyan)",
              fontSize: "1rem",
              marginTop: "0.25rem",
            }}
          >
            Active
          </div>
        </div>
      </div>

      <h3
        style={{
          fontSize: "0.85rem",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          color: "var(--text-3)",
          marginBottom: "0.75rem",
        }}
      >
        Actions
      </h3>

      <Link to="/admin/upload-students" style={{ textDecoration: "none" }}>
        <div className="course-item" style={{ marginBottom: "1rem" }}>
          <div>
            <div className="course-code">Upload Students</div>
            <div className="course-name">
              Bulk-import student matric list from CSV
            </div>
          </div>
          <span style={{ color: "var(--text-3)", fontSize: "1.2rem" }}>→</span>
        </div>
      </Link>

      <Link to="/admin/reports" style={{ textDecoration: "none" }}>
        <div className="course-item">
          <div>
            <div className="course-code">Attendance Reports</div>
            <div className="course-name">
              View course stats, check student eligibility, and export reports
            </div>
          </div>
          <span style={{ color: "var(--text-3)", fontSize: "1.2rem" }}>→</span>
        </div>
      </Link>
    </div>
  );
}
