// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./routes/ProtectedRoute.jsx";
import { Navbar } from "./components/common/Navbar.jsx";
import { useAuth } from "./hooks/useAuth.js";

import { Login } from "./pages/auth/Login.jsx";
import { Register } from "./pages/auth/Register.jsx";
import { AdminDashboard } from "./pages/admin/Dashboard.jsx";
import { UploadStudents } from "./pages/admin/UploadStudents.jsx";
import { LecturerDashboard } from "./pages/lecturer/Dashboard.jsx";
import { CreateCourse } from "./pages/lecturer/CreateCourse.jsx";
import { SessionControl } from "./pages/lecturer/SessionControl.jsx";
import { StudentDashboard } from "./pages/student/Dashboard.jsx";
import { BiometricSetup } from "./pages/student/BiometricSetup.jsx";
import { AttendSession } from "./pages/student/AttendSession.jsx";

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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
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
