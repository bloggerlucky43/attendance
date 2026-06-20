import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ProtectedRoute } from "./routes/ProtectedRoute.jsx";
import { Navbar } from "./components/common/Navbar.jsx";

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

function Home() {
  return (
    <div className="page">
      <h2>University Attendance System</h2>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Admin */}
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

          {/* Lecturer */}
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

          {/* Student */}
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
          <Route
            path="/attend/:token"
            element={
              <ProtectedRoute roles={["student"]}>
                <AttendSession />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
