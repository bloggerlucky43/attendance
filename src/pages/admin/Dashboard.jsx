import { Link } from "react-router-dom";

export function AdminDashboard() {
  return (
    <div className="page">
      <h2>Admin Dashboard</h2>
      <ul>
        <li>
          <Link to="/admin/upload-students">Upload Student List (CSV)</Link>
        </li>
      </ul>
    </div>
  );
}
