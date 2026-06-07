import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { departments } from '../api';

export default function DepartmentsPage() {
  const [list, setList] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    departments.list().then(setList).catch(e => setError(e.message));
  }, []);

  return (
    <div>
      <h1>Departments</h1>
      <p className="muted">All academic departments in the system.</p>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid grid-3" style={{ marginTop: '1.25rem' }}>
        {list.map(d => (
          <Link key={d.department_id} to={`/departments/${d.department_id}`} className="list-item">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', color: 'var(--accent-hover)', flexShrink: 0 }}>
                {d.department_code}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.95rem' }}>{d.department_name}</h3>
                <p className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>
                  {d.faculty_count} faculty · {d.course_count} courses
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {list.length === 0 && !error && <div className="empty-state"><div className="empty-state-icon">🏛️</div><p>No departments yet. Central admin can create departments.</p></div>}
    </div>
  );
}
