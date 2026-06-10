import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { schedules, departments, formatTime, DAYS } from '../api';

export default function WeeklyPage() {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState([]);
  const [depts, setDepts] = useState([]);
  const [deptId, setDeptId] = useState('');
  const [error, setError] = useState('');

  const urlYear = searchParams.get('year') || '';
  const urlSemester = searchParams.get('semester') || '';

  const load = () => {
    const params = {};
    if (deptId) params.department_id = deptId;
    if (urlYear) params.year = urlYear;
    if (urlSemester) params.semester = urlSemester;
    schedules.weekly(params).then(setData).catch(e => setError(e.message));
  };

  useEffect(() => {
    departments.list().then(setDepts).catch(() => {});
    load();
  }, []);

  useEffect(() => { load(); }, [deptId, urlYear, urlSemester]);

  // Build time slots
  const timeSlots = [];
  for (let h = 8; h < 18; h++) {
    timeSlots.push(`${String(h).padStart(2, '0')}:00`);
    timeSlots.push(`${String(h).padStart(2, '0')}:30`);
  }

  function findSlot(day, time) {
    const t = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]);
    return data.filter(s => {
      const d = s.day_of_week || s.day;
      if (d !== day) return false;
      const start = parseInt(String(s.start_time).slice(0, 2)) * 60 + parseInt(String(s.start_time).slice(3, 5));
      const end = parseInt(String(s.end_time).slice(0, 2)) * 60 + parseInt(String(s.end_time).slice(3, 5));
      return t >= start && t < end;
    });
  }

  const filterLabel = urlYear && urlSemester
    ? `Year ${urlYear} — Semester ${urlSemester}`
    : null;

  return (
    <div>
      <h1>Weekly Timetable</h1>
      {filterLabel && (
        <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent)', margin: '0.25rem 0 0.5rem' }}>
          📅 {filterLabel}
        </p>
      )}
      <p className="muted">Full weekly view of all scheduled classes.</p>

      <div className="card" style={{ margin: '1rem 0' }}>
        <div className="search-bar" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={deptId} onChange={e => setDeptId(e.target.value)}>
            <option value="">All departments</option>
            {depts.map(d => <option key={d.department_id} value={d.department_id}>{d.department_code} — {d.department_name}</option>)}
          </select>
          {filterLabel && (
            <Link to="/weekly" className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}>
              ✕ Clear Year/Semester Filter
            </Link>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card timetable">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              {DAYS.map(d => <th key={d}>{d.slice(0, 3)}</th>)}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map(time => (
              <tr key={time}>
                <td style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--muted)' }}>{time}</td>
                {DAYS.map(day => {
                  const items = findSlot(day, time);
                  return (
                    <td key={day} className={items.length ? 'occupied' : ''}>
                      {items.map((s, i) => (
                        <div key={i}>
                          <Link to={`/courses/${s.course_id || ''}`} style={{ fontWeight: 600, fontSize: '0.7rem' }}>
                            {s.course_code}
                          </Link>
                          <div style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>
                            {s.teacher_name?.split(' ').pop()} · {s.room_number || 'TBA'}
                          </div>
                        </div>
                      ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length === 0 && !error && <p className="muted" style={{ marginTop: '1rem', textAlign: 'center' }}>No schedule data{filterLabel ? ` for ${filterLabel}` : ''}. Import from Admin.</p>}
    </div>
  );
}
