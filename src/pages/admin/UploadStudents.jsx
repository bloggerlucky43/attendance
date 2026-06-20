import { useState } from "react";
import api from "../../lib/api.js";

// Expects a CSV with header: email,full_name,matric_number
// Parses client-side, sends parsed array to backend bulk-upload endpoint.
export function UploadStudents() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  function parseCSV(text) {
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim());
      const row = {};
      headers.forEach((h, i) => {
        row[h] = values[i];
      });
      return row;
    });
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return;
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const text = await file.text();
      const students = parseCSV(text);
      const { data } = await api.post("/students/bulk-upload", { students });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <h2>Upload Student List</h2>
      <p>
        CSV format: <code>email,full_name,matric_number</code>
      </p>
      <p>Default password for each student will be their matric number.</p>

      <form onSubmit={handleUpload}>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files[0])}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Uploading..." : "Upload CSV"}
        </button>
      </form>

      {error && <p className="gate-error">{error}</p>}

      {result && (
        <div className="result-box">
          <p>Created: {result.created}</p>
          {result.failed.length > 0 && (
            <>
              <p>Failed: {result.failed.length}</p>
              <ul>
                {result.failed.map((f, i) => (
                  <li key={i}>
                    {JSON.stringify(f.row)} — {f.reason}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
