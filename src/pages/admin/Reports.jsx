import { useEffect, useState } from "react";
import api from "../../lib/api.js";
import { Spinner } from "../../components/common/Spinner.jsx";

export function AdminReports() {
  const [courses, setCourses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [records, setRecords] = useState([]);
  const [students, setStudents] = useState([]);

  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function initData() {
      try {
        setError(null);
        // Load courses and sessions in parallel
        const [coursesRes, sessionsRes] = await Promise.all([
          api.get("/attendance/admin/courses"),
          api.get("/attendance/admin/sessions"),
        ]);
        setCourses(coursesRes.data.courses || []);
        setSessions(sessionsRes.data.sessions || []);

        // Default to first course if available
        if (coursesRes.data.courses?.length > 0) {
          setSelectedCourseId(coursesRes.data.courses[0].id);
        }
      } catch (err) {
        setError("Failed to load initial data. Check backend connection.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    initData();
  }, []);

  // Fetch roster and attendance records when selectedCourseId changes
  useEffect(() => {
    if (!selectedCourseId) return;

    async function loadCourseDetails() {
      try {
        setLoading(true);
        setError(null);

        // Fetch roster students for this course
        const rosterRes = await api.get(`/courses/${selectedCourseId}/students`);
        // Fetch all attendance records for this course
        const recordsRes = await api.get("/attendance/admin/report", {
          params: { course_id: selectedCourseId },
        });

        const enrolled = rosterRes.data.enrollments || [];
        const recordsData = recordsRes.data.records || [];

        // Build a unique map of students from both roster and actual attendance records
        const studentMap = new Map();

        // 1. Add enrolled students
        enrolled.forEach((item) => {
          if (item.students) {
            studentMap.set(item.student_id, {
              student_id: item.student_id,
              students: item.students,
            });
          }
        });

        // 2. Add students who marked attendance (but might not be enrolled)
        recordsData.forEach((record) => {
          if (record.students && !studentMap.has(record.student_id)) {
            studentMap.set(record.student_id, {
              student_id: record.student_id,
              students: record.students,
            });
          }
        });

        setStudents(Array.from(studentMap.values()));
        setRecords(recordsData);
        setSelectedSessionId(""); // reset session filter
      } catch (err) {
        setError("Failed to load course details.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadCourseDetails();
  }, [selectedCourseId]);

  // Find set of session IDs that have at least one attendance record in the loaded data
  const activeSessionIds = new Set(records.map((r) => r.session_id));

  // Filter sessions matching selected course and has at least one attendance record
  const courseSessions = sessions.filter(
    (s) => s.course_id === selectedCourseId && activeSessionIds.has(s.id)
  );

  // Compute records filtered by session
  const filteredRecords = selectedSessionId
    ? records.filter((r) => r.session_id === selectedSessionId)
    : records;

  // Calculate student statistics
  const rosterStats = students.map((enrollment) => {
    const student = enrollment.students;
    const studentId = enrollment.student_id;

    // Sessions count
    const sessionCount = selectedSessionId ? 1 : courseSessions.length;

    // Presents count
    const presentRecords = filteredRecords.filter(
      (r) => r.student_id === studentId
    );
    const presentCount = presentRecords.length;
    const absentCount = Math.max(0, sessionCount - presentCount);

    const percentage = sessionCount > 0 ? (presentCount / sessionCount) * 100 : 0;
    const isEligible = percentage >= 75.0;

    return {
      id: studentId,
      matric_number: student.matric_number,
      full_name: student.users?.full_name || "Unknown",
      email: student.users?.email || "",
      presentCount,
      absentCount,
      percentage: Number(percentage.toFixed(1)),
      isEligible,
    };
  });

  // Filter stats by search query (name or matric number)
  const searchedStats = rosterStats.filter(
    (s) =>
      (s.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.matric_number || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Global course calculations
  const totalClasses = selectedSessionId ? 1 : courseSessions.length;
  const avgAttendance =
    rosterStats.length > 0
      ? (rosterStats.reduce((sum, s) => sum + s.percentage, 0) /
          rosterStats.length).toFixed(1)
      : "0.0";
  const defaultersCount = rosterStats.filter((s) => !s.isEligible).length;

  async function handleExport() {
    setExporting(true);
    try {
      const response = await api.get("/attendance/admin/export", {
        params: {
          course_id: selectedCourseId || undefined,
          session_id: selectedSessionId || undefined,
        },
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      const courseCode =
        courses.find((c) => c.id === selectedCourseId)?.course_code || "report";
      link.setAttribute("download", `attendance_report_${courseCode}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Failed to export report CSV");
      console.error(err);
    } finally {
      setExporting(false);
    }
  }

  if (loading && courses.length === 0) {
    return <Spinner label="Loading reporting console..." />;
  }

  return (
    <div style={{ paddingBottom: "3rem" }}>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2>Attendance Reports</h2>
          <p>Monitor student eligibility thresholds and export attendance records</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleExport}
          disabled={exporting || rosterStats.length === 0}
        >
          {exporting ? "Exporting..." : "Export CSV"}
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: "1.5rem" }}>{error}</div>}

      {/* Filter Toolbar */}
      <div
        className="card"
        style={{
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          padding: "1rem 1.25rem",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ flex: "1 1 200px" }}>
          <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-2)", marginBottom: "0.35rem" }}>
            Select Course
          </label>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            style={{
              width: "100%",
              background: "var(--navy-light)",
              color: "var(--text-1)",
              border: "1px solid var(--border)",
              padding: "0.6rem 0.75rem",
              borderRadius: "8px",
              outline: "none",
            }}
          >
            <option value="" disabled>-- Select a course --</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.course_code} - {c.course_name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: "1 1 200px" }}>
          <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-2)", marginBottom: "0.35rem" }}>
            Select Session
          </label>
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            style={{
              width: "100%",
              background: "var(--navy-light)",
              color: "var(--text-1)",
              border: "1px solid var(--border)",
              padding: "0.6rem 0.75rem",
              borderRadius: "8px",
              outline: "none",
            }}
          >
            <option value="">All Sessions ({courseSessions.length})</option>
            {courseSessions.map((s) => (
              <option key={s.id} value={s.id}>
                Session: {new Date(s.started_at).toLocaleDateString()} {new Date(s.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({s.status})
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: "1 1 200px" }}>
          <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-2)", marginBottom: "0.35rem" }}>
            Search Student
          </label>
          <input
            type="text"
            placeholder="Search by name or matric..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              background: "var(--navy-light)",
              color: "var(--text-1)",
              border: "1px solid var(--border)",
              padding: "0.6rem 0.75rem",
              borderRadius: "8px",
              outline: "none",
            }}
          />
        </div>
      </div>

      {/* Statistics Cards */}
      {selectedCourseId && (
        <div className="stat-grid" style={{ marginBottom: "1.5rem" }}>
          <div className="stat-card">
            <div className="stat-label">Total Classes</div>
            <div className="stat-value" style={{ color: "var(--white)" }}>
              {totalClasses} {totalClasses === 1 ? "Session" : "Sessions"}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg. Attendance</div>
            <div className="stat-value" style={{ color: "var(--green)" }}>
              {avgAttendance}%
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Defaulters List</div>
            <div className="stat-value" style={{ color: "var(--red)" }}>
              {defaultersCount} {defaultersCount === 1 ? "Student" : "Students"}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Min. Threshold</div>
            <div className="stat-value" style={{ color: "var(--amber)" }}>
              75.0%
            </div>
          </div>
        </div>
      )}

      {/* Main Roster Table */}
      {selectedCourseId && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "1rem", color: "var(--white)" }}>Student Attendance Summary</h3>
          </div>
          {loading ? (
            <div style={{ padding: "3rem 0" }}>
              <Spinner label="Updating roster calculation..." />
            </div>
          ) : searchedStats.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-3)" }}>
              No students found matching your selection/search.
            </div>
          ) : (
            <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.1)", textAlign: "left" }}>
                  <th style={{ padding: "1rem 1.5rem", color: "var(--text-2)", fontSize: "0.8rem", fontWeight: "bold" }}>
                    MATRIC NUMBER
                  </th>
                  <th style={{ padding: "1rem 1.5rem", color: "var(--text-2)", fontSize: "0.8rem", fontWeight: "bold" }}>
                    FULL NAME
                  </th>
                  <th style={{ padding: "1rem 1.5rem", color: "var(--text-2)", fontSize: "0.8rem", fontWeight: "bold", textAlign: "center" }}>
                    CLASSES PRESENT
                  </th>
                  <th style={{ padding: "1rem 1.5rem", color: "var(--text-2)", fontSize: "0.8rem", fontWeight: "bold", textAlign: "center" }}>
                    CLASSES ABSENT
                  </th>
                  <th style={{ padding: "1rem 1.5rem", color: "var(--text-2)", fontSize: "0.8rem", fontWeight: "bold", textAlign: "center" }}>
                    PERCENTAGE
                  </th>
                  <th style={{ padding: "1rem 1.5rem", color: "var(--text-2)", fontSize: "0.8rem", fontWeight: "bold", textAlign: "center" }}>
                    STATUS
                  </th>
                </tr>
              </thead>
              <tbody>
                {searchedStats.map((s) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "1rem 1.5rem", fontFamily: "monospace" }}>{s.matric_number}</td>
                    <td style={{ padding: "1rem 1.5rem", fontWeight: "bold", color: "var(--white)" }}>{s.full_name}</td>
                    <td style={{ padding: "1rem 1.5rem", textAlign: "center" }}>{s.presentCount}</td>
                    <td style={{ padding: "1rem 1.5rem", textAlign: "center" }}>{s.absentCount}</td>
                    <td
                      style={{
                        padding: "1rem 1.5rem",
                        textAlign: "center",
                        fontWeight: "bold",
                        color: s.isEligible ? "var(--green)" : "var(--red)",
                      }}
                    >
                      {s.percentage}%
                    </td>
                    <td style={{ padding: "1rem 1.5rem", textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "0.25rem 0.5rem",
                          borderRadius: "4px",
                          fontSize: "0.7rem",
                          fontWeight: "bold",
                          letterSpacing: "0.05em",
                          background: s.isEligible ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                          color: s.isEligible ? "var(--green)" : "var(--red)",
                        }}
                      >
                        {s.isEligible ? "ELIGIBLE" : "DEFAULTER"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
