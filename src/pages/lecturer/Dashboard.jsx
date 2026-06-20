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
    <div>
      <div
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h2>My Courses</h2>
          <p>
            {courses.length} course{courses.length !== 1 ? "s" : ""} assigned
          </p>
        </div>
        <Link to="/lecturer/create-course" className="btn btn-primary">
          + New Course
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📚</div>
          <p>No courses yet. Create your first course to get started.</p>
          <Link
            to="/lecturer/create-course"
            className="btn btn-outline"
            style={{ marginTop: "1rem" }}
          >
            Create a Course
          </Link>
        </div>
      ) : (
        courses.map((c) => (
          <div className="course-item" key={c.id}>
            <div>
              <div className="course-code">{c.course_code}</div>
              <div className="course-name">{c.course_name}</div>
            </div>
            <Link
              to={`/lecturer/session/${c.id}`}
              className="btn btn-outline btn-sm"
            >
              Manage Sessions
            </Link>
          </div>
        ))
      )}
    </div>
  );
}
