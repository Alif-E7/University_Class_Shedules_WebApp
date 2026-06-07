export default function AboutPage() {
  return (
    <div className="card">
      <h1>About This System</h1>
      <p>
        <strong>University Faculty and Class Schedule Management System</strong> with Excel-based
        data import and a public information portal.
      </p>
      <h2>Architecture</h2>
      <pre style={{ background: '#f8fafc', padding: '1rem', borderRadius: 8, overflow: 'auto' }}>
{`Admin → Upload Excel (.xlsx)
         ↓
    Excel Parser (xlsx)
         ↓
    PostgreSQL (normalized)
         ↓
    Express API + React UI`}
      </pre>
      <p>
        Excel is an <em>import source</em>, not the database. The web app reads from PostgreSQL for
        fast search, filters, conflict detection, workload analysis, and exports.
      </p>
      <h2>Stack</h2>
      <ul>
        <li>PostgreSQL — database</li>
        <li>Express.js — REST API</li>
        <li>React (Vite) — frontend</li>
        <li>Node.js — runtime</li>
      </ul>
    </div>
  );
}
