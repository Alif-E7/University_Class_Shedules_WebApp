import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { rooms, formatTime } from '../api';

export default function RoomsPage() {
  const [list, setList] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    rooms.list().then(setList).catch(e => setError(e.message));
  }, []);

  const loadRoom = (id) => {
    rooms.get(id).then(setSelected).catch(e => setError(e.message));
  };

  return (
    <div>
      <h1>Rooms</h1>
      <p className="muted">View room schedules and availability.</p>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid grid-2" style={{ marginTop: '1.25rem' }}>
        <div>
          <div className="grid grid-2">
            {list.map(r => (
              <button
                key={r.room_id}
                type="button"
                className="list-item"
                style={{ width: '100%', textAlign: 'left', marginBottom: '0.5rem', border: selected?.room?.room_id === r.room_id ? '1px solid var(--accent)' : undefined }}
                onClick={() => loadRoom(r.room_id)}
              >
                <h3 style={{ margin: 0, fontSize: '0.95rem' }}>Room {r.room_number}</h3>
                <p className="muted" style={{ margin: 0, fontSize: '0.8rem' }}>
                  {r.building}{r.capacity ? ` · ${r.capacity} seats` : ''}
                  {r.department_code ? ` · ${r.department_code}` : ''}
                </p>
              </button>
            ))}
          </div>
          {list.length === 0 && <div className="empty-state"><div className="empty-state-icon">🚪</div><p>No rooms yet.</p></div>}
        </div>

        {selected && (
          <div className="card">
            <h2>Room {selected.room.room_number} — {selected.room.building}</h2>
            {selected.room.capacity && <p className="muted">Capacity: {selected.room.capacity} seats</p>}

            {selected.schedule.length === 0 ? (
              <p className="muted">No classes scheduled in this room.</p>
            ) : (
              selected.schedule.map((s, i) => (
                <div key={i} className="slot">
                  <span style={{ fontWeight: 600 }}>{s.day_of_week}</span>
                  <span>{formatTime(s.start_time)}–{formatTime(s.end_time)}</span>
                  <span>
                    {s.course_code} · {s.teacher_name}
                    <span className="muted"> · Sec {s.section}</span>
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
