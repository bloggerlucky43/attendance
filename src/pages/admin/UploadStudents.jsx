import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api.js";

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

export function UploadStudents() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef();

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
    <div>
      <div className="page-header">
        <h2>Upload Student List</h2>
        <p>
          Import students from a CSV file. Accounts are created automatically.
        </p>
      </div>

      <div className="card" style={{ maxWidth: 500 }}>
        <div className="alert alert-info" style={{ marginBottom: "1.25rem" }}>
          CSV format: <strong>email, full_name, matric_number</strong> — default
          password is each student's matric number.
        </div>

        <label
          className="file-input-wrap"
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files[0])}
          />
          {file ? (
            <p>
              <strong style={{ color: "var(--cyan)" }}>{file.name}</strong>
              <br />
              <span style={{ fontSize: "0.8rem" }}>Click to change file</span>
            </p>
          ) : (
            <p>Click to select a CSV file</p>
          )}
        </label>

        {error && <div className="alert alert-error">{error}</div>}

        <button
          className="btn btn-primary btn-full"
          onClick={handleUpload}
          disabled={!file || loading}
        >
          {loading ? "Uploading..." : "Upload Students"}
        </button>
      </div>

      {result && (
        <div className="card" style={{ maxWidth: 500, marginTop: "1rem" }}>
          <div
            className="alert alert-success"
            style={{ marginBottom: result.failed?.length ? "1rem" : 0 }}
          >
            {result.created} student accounts created successfully.
          </div>
          {result.failed?.length > 0 && (
            <>
              <div className="alert alert-warning">
                {result.failed.length} rows failed:
              </div>
              <table className="data-table" style={{ marginTop: "0.5rem" }}>
                <thead>
                  <tr>
                    <th>Matric</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {result.failed.map((f, i) => (
                    <tr key={i}>
                      <td>{f.row?.matric_number || "-"}</td>
                      <td>{f.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}
