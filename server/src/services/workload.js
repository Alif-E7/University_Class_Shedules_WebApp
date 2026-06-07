export function computeTeachingLoad(schedules, coursesById) {
  const uniqueCourses = new Set(schedules.map((s) => s.course_id));
  let totalCredits = 0;

  for (const cid of uniqueCourses) {
    const course = coursesById[cid];
    if (course) totalCredits += Number(course.credit) || 0;
  }

  return {
    courses: uniqueCourses.size,
    credits: totalCredits,
    weeklyClasses: schedules.length,
  };
}
