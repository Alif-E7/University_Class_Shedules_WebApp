import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { teachers, departments } from '../api';

export default function TeachersPage() {
  const [list, setList] = useState([]);
  const [depts, setDepts] = useState([]);
  const [q, setQ] = useState('');
  const [deptId, setDeptId] = useState('');
  const [designation, setDesignation] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    const params = {};
    if (q) params.q = q;
    if (deptId) params.department_id = deptId;
    if (designation) params.designation = designation;
    teachers.list(params).then(setList).catch(e => setError(e.message));
  };

  useEffect(() => {
    departments.list().then(setDepts).catch(() => {});
    load();
  }, []);

  return (
    <div>
      <h1>Faculty Directory</h1>
      <p className="muted">Search by name, staff number, or filter by department and designation.</p>

      <div className="card" style={{ margin: '1.25rem 0' }}>
        <div className="search-bar">
          <input placeholder="Name or Staff No..." value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} />
          <select value={deptId} onChange={e => setDeptId(e.target.value)}>
            <option value="">All departments</option>
            {depts.map(d => <option key={d.department_id} value={d.department_id}>{d.department_code} — {d.department_name}</option>)}
          </select>
          <input placeholder="Designation..." value={designation} onChange={e => setDesignation(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} />
          <button type="button" className="btn btn-primary" onClick={load}>Search</button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid grid-2">
        {list.map(t => (
          <Link key={t.teacher_id} to={`/teachers/${t.teacher_id}`} className="list-item">
            <h3 style={{ margin: 0 }}>{t.full_name}</h3>
            <p className="muted" style={{ margin: '0.35rem 0', fontSize: '0.85rem' }}>
              {t.designation || 'Faculty'} · {t.department_name || 'N/A'}
            </p>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <span className="badge badge-accent">{t.staff_no}</span>
              <span className="badge badge-muted">{t.department_code}</span>
            </div>
          </Link>
        ))}
      </div>
      {list.length === 0 && !error && <div className="empty-state"><div className="empty-state-icon">👩‍🏫</div><p>No teachers found. Admin can upload Excel data.</p></div>}
    </div>
  );
}
