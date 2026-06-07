import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { courses, formatTime } from '../api';

export default function CourseDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    courses.get(id).then(setData).catch(e => setError(e.message));
  }, [id]);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!data) return <div className="home-loading">Loading course…</div>;

  const { course, offerings, schedules } = data;

  return (
    <div>
      <Link to="/courses" className="muted" style={{ fontSize: '0.85rem' }}>← Back to catalog</Link>
      <header style={{ margin: '1rem 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0 }}>{course.course_title}</h1>
          <span className="badge badge-accent">{course.course_code}</span>
        </div>
        <p className="muted">{course.department_name} ({course.department_code}) · {course.credit} credits{course.semester ? ` · Semester ${course.semester}` : ''}</p>
      </header>

      <div className="grid grid-2">
        <div className="card">
          <h2>Offerings</h2>
          {offerings.length === 0 ? (
            <p className="muted">No offerings found for this course.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Teacher</th><th>Term</th><th>Section</th></tr>
              </thead>
              <tbody>
                {offerings.map(o => (
                  <tr key={o.offering_id}>
                    <td><Link to={`/teachers/${o.teacher_id}`}>{o.teacher_name}</Link> <span className="muted">({o.staff_no})</span></td>
                    <td>{o.academic_year} {o.term_name}</td>
                    <td><span className="badge badge-muted">{o.section}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <h2>Schedule</h2>
          {schedules.length === 0 ? (
            <p className="muted">No schedule slots found.</p>
          ) : (
            schedules.map((s, i) => (
              <div key={i} className="slot">
                <span style={{ fontWeight: 600 }}>{s.day_of_week}</span>
                <span>{formatTime(s.start_time)}–{formatTime(s.end_time)}</span>
                <span>
                  <Link to={`/teachers/${s.teacher_id}`}>{s.teacher_name}</Link>
                  <span className="muted"> · Sec {s.section} · Room {s.room_number || 'TBA'}</span>
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
