import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { courses, departments } from '../api';

export default function CoursesPage() {
  const [list, setList] = useState([]);
  const [depts, setDepts] = useState([]);
  const [q, setQ] = useState('');
  const [deptId, setDeptId] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    const params = {};
    if (q) params.q = q;
    if (deptId) params.department_id = deptId;
    courses.list(params).then(setList).catch(e => setError(e.message));
  };

  useEffect(() => {
    departments.list().then(setDepts).catch(() => {});
    load();
  }, []);

  return (
    <div>
      <h1>Course Catalog</h1>
      <p className="muted">Search by course code or title, filter by department.</p>

      <div className="card" style={{ margin: '1.25rem 0' }}>
        <div className="search-bar">
          <input placeholder="Course code or title..." value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} />
          <select value={deptId} onChange={e => setDeptId(e.target.value)}>
            <option value="">All departments</option>
            {depts.map(d => <option key={d.department_id} value={d.department_id}>{d.department_code} — {d.department_name}</option>)}
          </select>
          <button type="button" className="btn btn-primary" onClick={load}>Search</button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid grid-2">
        {list.map(c => (
          <Link key={c.course_id} to={`/courses/${c.course_id}`} className="list-item">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: 0 }}>{c.course_title}</h3>
                <p className="muted" style={{ margin: '0.25rem 0', fontSize: '0.85rem' }}>
                  {c.department_name} · {c.credit} credits{c.semester ? ` · Semester ${c.semester}` : ''}
                </p>
              </div>
              <span className="badge badge-accent">{c.course_code}</span>
            </div>
          </Link>
        ))}
      </div>
      {list.length === 0 && !error && <div className="empty-state"><div className="empty-state-icon">📖</div><p>No courses found.</p></div>}
    </div>
  );
}
