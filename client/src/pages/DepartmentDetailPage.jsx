import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { departments } from '../api';

export default function DepartmentDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    departments.get(id).then(setData).catch(e => setError(e.message));
  }, [id]);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!data) return <div className="home-loading">Loading department…</div>;

  const { department, stats, teachers: teacherList, courses: courseList } = data;

  return (
    <div>
      <Link to="/departments" className="muted" style={{ fontSize: '0.85rem' }}>← All departments</Link>
      <header style={{ margin: '1rem 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h1 style={{ margin: 0 }}>{department.department_name}</h1>
          <span className="badge badge-accent">{department.department_code}</span>
        </div>
        {department.office_email && <p className="muted">📧 {department.office_email}</p>}
      </header>

      <div className="grid grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-value">{stats.faculty}</div>
          <div className="stat-label">Faculty</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.courses}</div>
          <div className="stat-label">Courses</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.classesPerWeek}</div>
          <div className="stat-label">Weekly Classes</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h2>Faculty Members ({teacherList.length})</h2>
          {teacherList.length === 0 ? <p className="muted">No teachers yet.</p> : (
            <ul style={{ paddingLeft: '1rem', listStyle: 'none' }}>
              {teacherList.map(t => (
                <li key={t.teacher_id} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                  <Link to={`/teachers/${t.teacher_id}`} style={{ fontWeight: 600 }}>{t.full_name}</Link>
                  <span className="muted"> · {t.designation || 'Faculty'}</span>
                  <span className="badge badge-muted" style={{ marginLeft: '0.5rem' }}>{t.staff_no}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2>Courses ({courseList.length})</h2>
          {courseList.length === 0 ? <p className="muted">No courses yet.</p> : (
            <ul style={{ paddingLeft: '1rem', listStyle: 'none' }}>
              {courseList.map(c => (
                <li key={c.course_id} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                  <Link to={`/courses/${c.course_id}`} style={{ fontWeight: 600 }}>{c.course_code}</Link>
                  <span className="muted"> — {c.course_title} ({c.credit} cr)</span>
                  {c.semester && <span className="badge badge-gold" style={{ marginLeft: '0.5rem' }}>{c.semester}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
