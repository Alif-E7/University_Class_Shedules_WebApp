const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function parseTime(value) {
  if (!value) return null;
  const str = String(value).trim();
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) {
    const parts = str.split(':');
    const h = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    const s = parts[2] ? parts[2].padStart(2, '0') : '00';
    return `${h}:${m}:${s}`;
  }
  if (typeof value === 'number' && value < 1) {
    const totalMinutes = Math.round(value * 24 * 60);
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
  }
  return str;
}

export function timeToMinutes(timeStr) {
  const t = parseTime(timeStr);
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function normalizeDay(day) {
  if (!day) return '';
  const d = String(day).trim().toLowerCase();
  const map = {
    mon: 'Monday',
    monday: 'Monday',
    tue: 'Tuesday',
    tuesday: 'Tuesday',
    wed: 'Wednesday',
    wednesday: 'Wednesday',
    thu: 'Thursday',
    thursday: 'Thursday',
    fri: 'Friday',
    friday: 'Friday',
    sat: 'Saturday',
    saturday: 'Saturday',
    sun: 'Sunday',
    sunday: 'Sunday',
  };
  return map[d] || day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
}

export function dayIndex(day) {
  return DAY_ORDER.indexOf(normalizeDay(day));
}

export function overlaps(startA, endA, startB, endB) {
  const a1 = timeToMinutes(startA);
  const a2 = timeToMinutes(endA);
  const b1 = timeToMinutes(startB);
  const b2 = timeToMinutes(endB);
  return a1 < b2 && b1 < a2;
}

export { DAY_ORDER };
