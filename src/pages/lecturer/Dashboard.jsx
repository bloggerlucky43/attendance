import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api.js";
import { Spinner } from "../../components/common/Spinner.jsx";

export function LecturerDashboard() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/courses")
      .then(({ data }) => setCourses(data.courses))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="Loading courses..." />;

  return (
    <div className="page">
      <h2>My Courses</h2>
      <Link to="/lecturer/create-course">+ Create New Course</Link>

      <ul>
        {courses.map((c) => (
          <li key={c.id}>
            <strong>{c.course_code}</strong> — {c.course_name}{" "}
            <Link to={`/lecturer/session/${c.id}`}>Manage Sessions</Link>
          </li>
        ))}
      </ul>

      {courses.length === 0 && (
        <p>No courses yet. Create one to get started.</p>
      )}
    </div>
  );
}
