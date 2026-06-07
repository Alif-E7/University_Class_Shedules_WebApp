export function findScheduleConflicts(slots) {
  const conflicts = [];
  const byTeacherDay = {};

  for (const s of slots) {
    const key = `${s.teacher_id}|${s.day_of_week}`;
    if (!byTeacherDay[key]) byTeacherDay[key] = [];
    byTeacherDay[key].push(s);
  }

  for (const items of Object.values(byTeacherDay)) {
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        if (overlaps(a.start_time, a.end_time, b.start_time, b.end_time)) {
          conflicts.push({
            teacher_id: a.teacher_id,
            teacher_name: a.teacher_name,
            day: a.day_of_week,
            class1: {
              course_code: a.course_code,
              course_title: a.course_title,
              start_time: a.start_time,
              end_time: a.end_time,
              room: a.room_number,
            },
            class2: {
              course_code: b.course_code,
              course_title: b.course_title,
              start_time: b.start_time,
              end_time: b.end_time,
              room: b.room_number,
            },
          });
        }
      }
    }
  }
  return conflicts;
}

function overlaps(s1, e1, s2, e2) {
  const toMin = (t) => {
    const str = String(t).slice(0, 5);
    const [h, m] = str.split(':').map(Number);
    return h * 60 + (m || 0);
  };
  return toMin(s1) < toMin(e2) && toMin(s2) < toMin(e1);
}
