// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./routes/ProtectedRoute.jsx";
import { Navbar } from "./components/common/Navbar.jsx";
import { useAuth } from "./hooks/useAuth.js";
import { Home } from "./pages/Home.jsx";
import { Login } from "./pages/auth/Login.jsx";
import { Register } from "./pages/auth/Register.jsx";
import { AdminDashboard } from "./pages/admin/Dashboard.jsx";
import { UploadStudents } from "./pages/admin/UploadStudents.jsx";
import { AdminReports } from "./pages/admin/Reports.jsx";
import { LecturerDashboard } from "./pages/lecturer/Dashboard.jsx";
import { CreateCourse } from "./pages/lecturer/CreateCourse.jsx";
import { SessionControl } from "./pages/lecturer/SessionControl.jsx";
import { StudentDashboard } from "./pages/student/Dashboard.jsx";
import { BiometricSetup } from "./pages/student/BiometricSetup.jsx";
import { AttendSession } from "./pages/student/AttendSession.jsx";

const DASHBOARD_PATH = {
  admin: "/admin",
  lecturer: "/lecturer",
  student: "/student",
};

function Shell({ children }) {
  const { user } = useAuth();
  if (!user) return children;
  return (
    <div className="app-shell">
      <Navbar />
      <div className="main-content">{children}</div>
    </div>
  );
}

function RootRoute() {
  const { user } = useAuth();
  if (user)
    return <Navigate to={DASHBOARD_PATH[user.role] ?? "/login"} replace />;
  return <Home />;
}
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/attend/:token"
          element={
            <ProtectedRoute roles={["student"]}>
              <AttendSession />
            </ProtectedRoute>
          }
        />
        <Route
          path="/*"
          element={
            <Shell>
              <Routes>
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/upload-students"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <UploadStudents />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/reports"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <AdminReports />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/lecturer"
                  element={
                    <ProtectedRoute roles={["lecturer"]}>
                      <LecturerDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/lecturer/create-course"
                  element={
                    <ProtectedRoute roles={["lecturer"]}>
                      <CreateCourse />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/lecturer/session/:courseId"
                  element={
                    <ProtectedRoute roles={["lecturer"]}>
                      <SessionControl />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student"
                  element={
                    <ProtectedRoute roles={["student"]}>
                      <StudentDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/student/biometric-setup"
                  element={
                    <ProtectedRoute roles={["student"]}>
                      <BiometricSetup />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Shell>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
