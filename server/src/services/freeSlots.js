const DAY_ORDER = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function timeToMinutes(t) {
  if (!t) return 0;
  const str = String(t).slice(0, 5);
  const [h, m] = str.split(':').map(Number);
  return h * 60 + (m || 0);
}

const WORK_START = 9 * 60;
const WORK_END = 17 * 60;

function formatMinutes(m) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export function computeFreeSlots(schedules, dayFilter) {
  const days = dayFilter ? [dayFilter] : DAY_ORDER.slice(1, 6); // Mon-Fri by default
  const result = {};

  for (const day of days) {
    const daySchedules = schedules
      .filter(s => (s.day_of_week || s.day) === day)
      .map(s => ({
        start: timeToMinutes(s.start_time),
        end: timeToMinutes(s.end_time),
      }))
      .sort((a, b) => a.start - b.start);

    const occupied = [];
    for (const m of daySchedules) {
      if (!occupied.length || m.start > occupied[occupied.length - 1].end) {
        occupied.push({ ...m });
      } else {
        occupied[occupied.length - 1].end = Math.max(occupied[occupied.length - 1].end, m.end);
      }
    }

    const free = [];
    let cursor = WORK_START;
    for (const o of occupied) {
      if (o.start > cursor) {
        free.push({ start: formatMinutes(cursor), end: formatMinutes(o.start) });
      }
      cursor = Math.max(cursor, o.end);
    }
    if (cursor < WORK_END) {
      free.push({ start: formatMinutes(cursor), end: formatMinutes(WORK_END) });
    }

    if (free.length) result[day] = free;
  }
  return result;
}

export function getTeacherAvailabilityNow(schedules, now = new Date()) {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = dayNames[now.getDay()];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const todaySchedules = schedules
    .filter(s => (s.day_of_week || s.day) === today)
    .map(s => ({
      ...s,
      startMin: timeToMinutes(s.start_time),
      endMin: timeToMinutes(s.end_time),
    }))
    .sort((a, b) => a.startMin - b.startMin);

  const current = todaySchedules.find(s => currentMinutes >= s.startMin && currentMinutes < s.endMin);

  if (current) {
    return {
      available: false,
      currentlyTeaching: true,
      currentClass: current,
      nextClass: todaySchedules.find(s => s.startMin > currentMinutes) || null,
    };
  }

  return {
    available: true,
    currentlyTeaching: false,
    currentClass: null,
    nextClass: todaySchedules.find(s => s.startMin > currentMinutes) || null,
  };
}
