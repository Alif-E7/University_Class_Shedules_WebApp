import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { home, formatTime } from '../api';
import FloatingCarousel from '../components/FloatingCarousel';

const DEPT_COLORS = {
  CSE: '#6366f1', EEE: '#f59e0b', BBA: '#10b981', LAW: '#ef4444',
  PHY: '#8b5cf6', CHE: '#06b6d4', MAT: '#ec4899', ENG: '#14b8a6',
};

function deptColor(code) { return DEPT_COLORS[code] || '#8b5cf6'; }

function ClassSlide({ item, variant = 'hero' }) {
  return (
    <div className={`class-slide ${variant}`}>
      <div className="class-slide-time">
        {formatTime(item.start_time)} – {formatTime(item.end_time)}
      </div>
      <h3 className="class-slide-title">{item.course_title}</h3>
      <p className="class-slide-code">{item.course_code} · Sec {item.section} · {item.batch || 'General'}</p>
      <p className="class-slide-teacher">
        <Link to={`/teachers/${item.teacher_id}`}>{item.teacher_name}</Link>
        {item.designation && <span> · {item.designation}</span>}
      </p>
      <p className="class-slide-meta">
        Room {item.room_number || 'TBA'}
        {item.building && item.building !== 'Main' ? ` · ${item.building}` : ''}
        {' · '}{item.department_name || item.department_code}
      </p>
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    home.homepage()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="home-loading">Loading today's schedule…</div>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!data) return null;

  const deptCodes = Object.keys(data.departments || {});

  return (
    <div className="home-page">
      <header className="home-header">
        <p className="home-date">{data.dateLabel}</p>
        <h1>Today's Classes</h1>
        <p className="home-sub">
          Live schedule grouped by department — each card rotates every 5 seconds.
        </p>
      </header>

      {/* Department stats */}
      {data.allDepartments?.length > 0 && (
        <section className="grid grid-4" style={{ marginBottom: '2rem' }}>
          {data.allDepartments.map(d => (
            <Link key={d.department_id} to={`/departments/${d.department_id}`} className="stat-card list-item" style={{ padding: '1rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: deptColor(d.department_code), textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {d.department_code}
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink)', margin: '0.2rem 0' }}>
                {d.department_name}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                {d.faculty_count} faculty · {d.course_count} courses
              </div>
            </Link>
          ))}
        </section>
      )}

      {deptCodes.map(dept => {
        const batches = data.departments[dept] || [];
        const classes = data.byDepartment?.[dept] || [];
        const color = deptColor(dept);

        return (
          <section key={dept} className="dept-block" style={{ '--dept-color': color }}>
            <div className="dept-block-head">
              <h2>{dept} Department</h2>
              <div className="batch-chips">
                {batches.length === 0
                  ? <span className="batch-chip muted-chip">No active batches</span>
                  : batches.map(b => <span key={b} className="batch-chip">{b}</span>)
                }
              </div>
            </div>
            <FloatingCarousel
              items={classes}
              accent={color}
              emptyMessage={`No classes today for ${dept}`}
              renderSlide={item => <ClassSlide item={item} variant="hero" />}
            />
          </section>
        );
      })}

      {deptCodes.length === 0 && (
        <section className="dept-block">
          <FloatingCarousel
            items={data.classes || []}
            emptyMessage="No classes scheduled today — upload data from Admin panel"
            renderSlide={item => <ClassSlide item={item} variant="hero" />}
          />
        </section>
      )}

      {data.activeBatches?.length > 0 && (
        <section className="semester-section">
          <h2 className="semester-section-title">Running Semesters</h2>
          <p className="home-sub" style={{ textAlign: 'center' }}>All active batches — rotating today's classes</p>
          {data.activeBatches.map(batch => {
            const items = data.byBatch?.[batch] || [];
            return (
              <div key={batch} className="semester-row">
                <div className="semester-label">
                  <span className="semester-badge">{batch}</span>
                  <span className="semester-name">Semester {batch}</span>
                  <span className="semester-count">{items.length} class{items.length !== 1 ? 'es' : ''} today</span>
                </div>
                <FloatingCarousel
                  items={items}
                  accent="#6366f1"
                  emptyMessage={`No classes today for batch ${batch}`}
                  renderSlide={item => <ClassSlide item={item} variant="compact" />}
                />
              </div>
            );
          })}
        </section>
      )}

      <nav className="home-quick-links">
        <Link to="/teachers" className="btn btn-primary">Faculty Directory</Link>
        <Link to="/courses" className="btn btn-outline">Course Catalog</Link>
        <Link to="/weekly" className="btn btn-outline">Weekly Grid</Link>
        <Link to="/departments" className="btn btn-outline">Departments</Link>
        <Link to="/admin" className="btn btn-outline">Admin Panel</Link>
      </nav>
    </div>
  );
}
