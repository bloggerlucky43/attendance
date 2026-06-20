import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
    <div className="page">
      <h2>Create Course</h2>
      <form onSubmit={handleSubmit}>
        <input
          placeholder="Course Code (e.g. CSC401)"
          value={courseCode}
          onChange={(e) => setCourseCode(e.target.value)}
          required
        />
        <input
          placeholder="Course Name"
          value={courseName}
          onChange={(e) => setCourseName(e.target.value)}
          required
        />
        {error && <p className="gate-error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Course"}
        </button>
      </form>
    </div>
  );
}
