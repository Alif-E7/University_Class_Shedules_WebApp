import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { teachers, exportUrl, formatTime } from '../api';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function groupByDay(schedules) {
  const map = {};
  for (const d of DAYS) map[d] = [];
  for (const s of schedules) {
    const day = s.day_of_week || s.day;
    if (!map[day]) map[day] = [];
    map[day].push(s);
  }
  return map;
}

export default function TeacherProfilePage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    teachers.get(id).then(setData).catch(e => setError(e.message));
  }, [id]);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!data) return <div className="home-loading">Loading profile…</div>;

  const { teacher, schedules, courses, workload, freeSlots, availability, conflicts } = data;
  const byDay = groupByDay(schedules);

  return (
    <div>
      <Link to="/teachers" className="muted" style={{ fontSize: '0.85rem' }}>← Back to directory</Link>
      <header style={{ margin: '1rem 0' }}>
        <h1>{teacher.full_name}</h1>
        <p className="muted">{teacher.designation} · {teacher.department_name} ({teacher.department_code})</p>
      </header>

      <div className="grid grid-2" style={{ marginBottom: '1rem' }}>
        <div className="card">
          <h2>Profile</h2>
          <p><strong>Staff No:</strong> {teacher.staff_no}</p>
          <p><strong>Email:</strong> {teacher.email || '—'}</p>
          <p><strong>Phone:</strong> {teacher.phone || '—'}</p>
          <p><strong>Office:</strong> {teacher.office_room || '—'}</p>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <a className="btn btn-outline" href={exportUrl('pdf', id)} target="_blank" rel="noreferrer">📄 Export PDF</a>
            <a className="btn btn-outline" href={exportUrl('excel', id)} download>📊 Export Excel</a>
          </div>
        </div>

        <div className="card">
          <h2>Teaching Load</h2>
          <div className="grid grid-3">
            <div className="stat">
              <div className="stat-value">{workload.courses}</div>
              <div className="stat-label">Courses</div>
            </div>
            <div className="stat">
              <div className="stat-value">{workload.credits}</div>
              <div className="stat-label">Credits</div>
            </div>
            <div className="stat">
              <div className="stat-value">{workload.weeklyClasses}</div>
              <div className="stat-label">Weekly Classes</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h2>Availability Now</h2>
        {availability.available ? (
          <p><span className="badge badge-success">Available</span> — Not in class right now.</p>
        ) : (
          <p><span className="badge badge-warn">Teaching</span> — Currently in {availability.currentClass?.course_title}.</p>
        )}
        {availability.nextClass && (
          <p className="muted">Next class: {formatTime(availability.nextClass.start_time)} ({availability.nextClass.course_code})</p>
        )}
      </div>

      {conflicts.length > 0 && (
        <div className="alert alert-warn">
          <strong>⚠ Schedule conflicts:</strong>
          <ul>{conflicts.map((c, i) => (
            <li key={i}>{c.day}: {c.class1.course_code} overlaps {c.class2.course_code}</li>
          ))}</ul>
        </div>
      )}

      <div className="grid grid-2">
        <div className="card">
          <h2>Weekly Schedule</h2>
          {DAYS.map(day =>
            byDay[day]?.length ? (
              <div key={day} className="schedule-day">
                <h3>{day}</h3>
                {byDay[day].map((s, i) => (
                  <div key={i} className="slot">
                    <span>{formatTime(s.start_time)}–{formatTime(s.end_time)}</span>
                    <span>
                      <Link to={`/courses/${s.course_id}`}>{s.course_title || s.course_code}</Link>
                      <span className="muted"> · {s.section} · Room {s.room_number || 'TBA'}</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : null
          )}
          {schedules.length === 0 && <p className="muted">No schedule data available.</p>}
        </div>

        <div className="card">
          <h2>Free Time Slots</h2>
          <p className="muted" style={{ fontSize: '0.8rem' }}>Weekdays 09:00–17:00 (gaps between classes)</p>
          {Object.keys(freeSlots).length === 0 ? (
            <p className="muted">No free slots computed.</p>
          ) : (
            Object.entries(freeSlots).map(([day, slots]) => (
              <div key={day} className="schedule-day">
                <h3>{day}</h3>
                {slots.map((s, i) => <p key={i} style={{ fontSize: '0.9rem' }}>{s.start} – {s.end}</p>)}
              </div>
            ))
          )}

          <h2 style={{ marginTop: '1.5rem' }}>Courses</h2>
          <ul style={{ paddingLeft: '1rem' }}>
            {courses.map(c => (
              <li key={c.course_id} style={{ marginBottom: '0.35rem' }}>
                <Link to={`/courses/${c.course_id}`}>{c.course_code}</Link> — {c.course_title} ({c.credit} cr)
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
