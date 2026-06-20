import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../lib/api.js";

export function CreateCourse() {
  const [courseCode, setCourseCode] = useState("");
  const [courseName, setCourseName] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/courses", {
        course_code: courseCode,
        course_name: courseName,
      });
      navigate("/lecturer");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create course");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Create Course</h2>
        <p>Add a new course to start taking attendance</p>
      </div>

      <div className="card" style={{ maxWidth: 460 }}>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Course Code</label>
            <input
              className="form-input"
              placeholder="e.g. CSC401"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Course Name</label>
            <input
              className="form-input"
              placeholder="e.g. Advanced Algorithms"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              required
            />
          </div>
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? "Creating..." : "Create Course"}
            </button>
            <Link to="/lecturer" className="btn btn-ghost">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
