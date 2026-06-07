import XLSX from 'xlsx';

function sheetToRows(workbook, ...names) {
  for (const name of names) {
    const sheet = workbook.Sheets[name];
    if (sheet) return XLSX.utils.sheet_to_json(sheet, { defval: '' });
  }
  return null;
}

function pick(row, ...keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== '') return String(row[key]).trim();
  }
  return '';
}

const VALID_DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function normalizeDay(d) {
  if (!d) return '';
  const s = d.trim();
  return VALID_DAYS.find(day => day.toLowerCase() === s.toLowerCase()) || s;
}

function parseTime(t) {
  if (!t && t !== 0) return null;
  
  if (t instanceof Date) {
    const h = t.getHours();
    const m = t.getMinutes();
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  let s = String(t).trim();
  
  // Check for AM/PM format first, e.g. "09:00 AM" or "9:30 PM" or "5 PM"
  const ampmMatch = s.match(/^(\d{1,2})(?::(\d{2}))?(?:\s*)([aApP][mM])/);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const m = ampmMatch[2] ? ampmMatch[2] : '00';
    const ampm = ampmMatch[3].toLowerCase();
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m}`;
  }

  // Standard HH:MM or H:MM or HH:MM:SS
  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) {
    return `${m[1].padStart(2, '0')}:${m[2]}`;
  }

  // Numeric (Excel serial time)
  const n = parseFloat(s);
  if (!isNaN(n) && n >= 0 && n < 1) {
    const total = Math.round(n * 24 * 60);
    const h = Math.floor(total / 60);
    const min = total % 60;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }

  return s;
}

/**
 * Parse workbook for the new 5-sheet format.
 * Sheets: Department, Teachers, Courses, Offerings, Schedule
 */
export function parseWorkbook(buffer, uploaderDeptCode = null) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });

  const deptRows = sheetToRows(workbook, 'Department', 'department', 'Departments', 'departments');
  const teacherRows = sheetToRows(workbook, 'Teachers', 'teachers');
  const courseRows = sheetToRows(workbook, 'Courses', 'courses');
  const offeringRows = sheetToRows(workbook, 'Offerings', 'offerings');
  const scheduleRows = sheetToRows(workbook, 'Schedule', 'schedule');

  const teachersList = teacherRows || [];
  const coursesList = courseRows || [];
  const offeringsList = offeringRows || [];
  const schedulesList = scheduleRows || [];

  if (teachersList.length === 0 && coursesList.length === 0 && offeringsList.length === 0 && schedulesList.length === 0) {
    throw new Error('Excel must contain at least one valid sheet: Teachers, Courses, Offerings, or Schedule');
  }

  const errors = [];
  const warnings = [];

  // ── Parse department info ──
  let departmentCode = uploaderDeptCode || null;
  let departmentName = null;
  if (deptRows && deptRows.length > 0) {
    departmentCode = pick(deptRows[0], 'department_code', 'DepartmentCode', 'Code', 'code') || departmentCode;
    departmentName = pick(deptRows[0], 'department_name', 'DepartmentName', 'Name', 'name');
  }

  // ── Parse teachers ──
  const teachers = teachersList.map((row, i) => {
    const staff_no = pick(row, 'staff_no', 'StaffNo', 'Staff No', 'ID', 'Id', 'teacher_id', 'TeacherID');
    const full_name = pick(row, 'full_name', 'FullName', 'Name', 'name');
    const email = pick(row, 'Email', 'email');
    const phone = pick(row, 'Phone', 'phone');
    const designation = pick(row, 'Designation', 'designation');
    const office_room = pick(row, 'OfficeRoom', 'Office Room', 'office_room', 'Room');
    const dept_code = pick(row, 'department_code', 'DepartmentCode', 'Department', 'department') || departmentCode;

    if (!staff_no) errors.push(`Teachers row ${i + 2}: missing staff_no/ID`);
    if (!full_name) errors.push(`Teachers row ${i + 2}: missing name`);

    return { staff_no, full_name, email, phone, designation, office_room, department_code: dept_code };
  });

  // Check duplicate staff numbers within same department
  const staffKeys = new Map();
  for (const t of teachers) {
    const key = `${t.department_code}|${t.staff_no}`;
    if (staffKeys.has(key)) {
      errors.push(`Duplicate staff_no "${t.staff_no}" in department "${t.department_code}"`);
    }
    staffKeys.set(key, true);
  }

  // ── Parse courses ──
  const courses = coursesList.map((row, i) => {
    const course_code = pick(row, 'course_code', 'CourseCode', 'Course Code', 'CourseID', 'course_id', 'ID');
    const course_title = pick(row, 'course_title', 'CourseTitle', 'Title', 'title');
    const credit = parseInt(pick(row, 'Credit', 'Credits', 'credit') || '3', 10);
    const semester = pick(row, 'Semester', 'semester', 'Batch', 'batch');
    const dept_code = pick(row, 'department_code', 'DepartmentCode', 'Department', 'department') || departmentCode;

    if (!course_code) errors.push(`Courses row ${i + 2}: missing course_code`);
    if (!course_title) errors.push(`Courses row ${i + 2}: missing title`);

    return { course_code, course_title, credit, semester, department_code: dept_code };
  });

  // Check duplicate course codes within same department
  const courseKeys = new Map();
  for (const c of courses) {
    const key = `${c.department_code}|${c.course_code}`;
    if (courseKeys.has(key)) {
      errors.push(`Duplicate course_code "${c.course_code}" in department "${c.department_code}"`);
    }
    courseKeys.set(key, true);
  }

  // ── Parse offerings ──
  const offerings = offeringsList.map((row, i) => {
    const course_code = pick(row, 'course_code', 'CourseCode', 'Course Code', 'CourseID');
    const staff_no = pick(row, 'staff_no', 'StaffNo', 'Staff No', 'TeacherID', 'teacher_id');
    const term = pick(row, 'term', 'Term', 'term_name');
    const section = pick(row, 'section', 'Section') || 'A';
    const dept_code = pick(row, 'department_code', 'DepartmentCode', 'Department', 'department') || departmentCode;

    if (!course_code) errors.push(`Offerings row ${i + 2}: missing course_code`);
    if (!staff_no) errors.push(`Offerings row ${i + 2}: missing staff_no`);

    return { course_code, staff_no, term, section, department_code: dept_code };
  });

  // ── Parse schedule ──
  const schedules = schedulesList.map((row, i) => {
    const course_code = pick(row, 'course_code', 'CourseCode', 'Course Code', 'CourseID');
    const term = pick(row, 'term', 'Term', 'term_name');
    const section = pick(row, 'section', 'Section') || 'A';
    const day = normalizeDay(pick(row, 'Day', 'day', 'day_of_week'));
    const start_time = parseTime(row.Start ?? row.start ?? row['Start Time'] ?? row.start_time);
    const end_time = parseTime(row.End ?? row.end ?? row['End Time'] ?? row.end_time);
    const room_number = pick(row, 'Room', 'room', 'room_number', 'RoomNumber');
    const building = pick(row, 'Building', 'building') || 'Main';
    const dept_code = pick(row, 'department_code', 'DepartmentCode', 'Department', 'department') || departmentCode;

    if (!course_code) errors.push(`Schedule row ${i + 2}: missing course_code`);
    if (!day) errors.push(`Schedule row ${i + 2}: missing day`);
    if (!start_time) errors.push(`Schedule row ${i + 2}: missing start_time`);
    if (!end_time) errors.push(`Schedule row ${i + 2}: missing end_time`);
    if (day && !VALID_DAYS.includes(day)) errors.push(`Schedule row ${i + 2}: invalid day "${day}"`);

    return { course_code, term, section, day, start_time, end_time, room_number, building, department_code: dept_code };
  });

  // ── Cross-reference validation ──
  const courseCodeSet = new Set(courses.map(c => c.course_code).filter(Boolean));
  const staffNoSet = new Set(teachers.map(t => t.staff_no).filter(Boolean));
  const hasCourses = courses.length > 0;
  const hasTeachers = teachers.length > 0;

  for (const o of offerings) {
    if (hasCourses && o.course_code && !courseCodeSet.has(o.course_code)) {
      warnings.push(`Offering references unknown course: ${o.course_code}`);
    }
    if (hasTeachers && o.staff_no && !staffNoSet.has(o.staff_no)) {
      warnings.push(`Offering references unknown teacher: ${o.staff_no}`);
    }
  }

  for (const s of schedules) {
    if (hasCourses && s.course_code && !courseCodeSet.has(s.course_code)) {
      warnings.push(`Schedule references unknown course: ${s.course_code}`);
    }
  }

  // ── Detect time conflicts ──
  const conflicts = detectScheduleConflicts(schedules, offerings, teachers);

  return {
    department: { department_code: departmentCode, department_name: departmentName },
    teachers,
    courses,
    offerings,
    schedules,
    errors,
    warnings,
    conflicts,
    summary: {
      teachers: teachers.length,
      courses: courses.length,
      offerings: offerings.length,
      schedules: schedules.length,
      errors: errors.length,
      warnings: warnings.length,
      conflicts: conflicts.length,
    },
  };
}


function detectScheduleConflicts(schedules, offerings, teachers) {
  const conflicts = [];

  // Build offering→teacher mapping
  const offeringTeacher = {};
  for (const o of offerings) {
    const key = `${o.course_code}|${o.section}`;
    offeringTeacher[key] = o.staff_no;
  }

  // Group by teacher+day
  const byTeacherDay = {};
  for (const s of schedules) {
    const teacherKey = `${s.course_code}|${s.section}`;
    const staffNo = offeringTeacher[teacherKey];
    if (!staffNo || !s.day) continue;
    const key = `${staffNo}|${s.day}`;
    if (!byTeacherDay[key]) byTeacherDay[key] = [];
    byTeacherDay[key].push(s);
  }

  for (const [key, items] of Object.entries(byTeacherDay)) {
    const [staffNo, day] = key.split('|');
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        if (timeOverlaps(items[i].start_time, items[i].end_time, items[j].start_time, items[j].end_time)) {
          conflicts.push({
            type: 'teacher_overlap',
            staff_no: staffNo,
            day,
            slot1: items[i],
            slot2: items[j],
            message: `Teacher ${staffNo} has overlapping classes on ${day}`,
          });
        }
      }
    }
  }

  // Room conflicts
  const byRoomDay = {};
  for (const s of schedules) {
    if (!s.room_number || !s.day) continue;
    const key = `${s.building}|${s.room_number}|${s.day}`;
    if (!byRoomDay[key]) byRoomDay[key] = [];
    byRoomDay[key].push(s);
  }

  for (const [key, items] of Object.entries(byRoomDay)) {
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        if (timeOverlaps(items[i].start_time, items[i].end_time, items[j].start_time, items[j].end_time)) {
          conflicts.push({
            type: 'room_overlap',
            room: items[i].room_number,
            day: items[i].day,
            slot1: items[i],
            slot2: items[j],
            message: `Room ${items[i].room_number} has overlapping classes on ${items[i].day}`,
          });
        }
      }
    }
  }

  return conflicts;
}

function timeOverlaps(s1, e1, s2, e2) {
  const toMin = (t) => {
    if (!t) return 0;
    const str = String(t).slice(0, 5);
    const [h, m] = str.split(':').map(Number);
    return h * 60 + (m || 0);
  };
  return toMin(s1) < toMin(e2) && toMin(s2) < toMin(e1);
}

/**
 * Commit parsed import data into the database.
 * 7-stage pipeline: match → insert/update → commit
 */
export async function commitImportToDb(pool, data, departmentId, termId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Department ──
    let deptId = departmentId;
    if (!deptId && data.department?.department_code) {
      const res = await client.query(
        `INSERT INTO departments (department_code, department_name)
         VALUES ($1, $2)
         ON CONFLICT (department_code) DO UPDATE SET department_name = COALESCE(EXCLUDED.department_name, departments.department_name)
         RETURNING department_id`,
        [data.department.department_code.toUpperCase(), data.department.department_name || data.department.department_code]
      );
      deptId = res.rows[0].department_id;
    }

    if (!deptId) throw new Error('Cannot determine department for import');

    // ── Teachers: upsert by (department_id, staff_no) ──
    const teacherMap = {}; // staff_no → teacher_id
    for (const t of data.teachers) {
      if (!t.staff_no) continue;
      const res = await client.query(
        `INSERT INTO teachers (department_id, staff_no, full_name, designation, email, phone, office_room)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (department_id, staff_no) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           designation = COALESCE(EXCLUDED.designation, teachers.designation),
           email = COALESCE(EXCLUDED.email, teachers.email),
           phone = COALESCE(EXCLUDED.phone, teachers.phone),
           office_room = COALESCE(EXCLUDED.office_room, teachers.office_room),
           updated_at = NOW()
         RETURNING teacher_id`,
        [deptId, t.staff_no, t.full_name, t.designation || null, t.email || null, t.phone || null, t.office_room || null]
      );
      teacherMap[t.staff_no] = res.rows[0].teacher_id;
    }

    // ── Courses: upsert by (department_id, course_code) ──
    const courseMap = {}; // course_code → course_id
    for (const c of data.courses) {
      if (!c.course_code) continue;
      const res = await client.query(
        `INSERT INTO courses (department_id, course_code, course_title, credit, semester)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (department_id, course_code) DO UPDATE SET
           course_title = EXCLUDED.course_title,
           credit = EXCLUDED.credit,
           semester = COALESCE(EXCLUDED.semester, courses.semester),
           updated_at = NOW()
         RETURNING course_id`,
        [deptId, c.course_code.toUpperCase(), c.course_title, c.credit || 3, c.semester || null]
      );
      courseMap[c.course_code] = res.rows[0].course_id;
      courseMap[c.course_code.toUpperCase()] = res.rows[0].course_id;
    }

    // ── Rooms: upsert by (building, room_number) ──
    const roomMap = {}; // "building|room_number" → room_id
    const roomSet = new Set();
    for (const s of data.schedules) {
      if (s.room_number) roomSet.add(`${s.building || 'Main'}|${s.room_number}`);
    }
    for (const key of roomSet) {
      const [building, room_number] = key.split('|');
      const res = await client.query(
        `INSERT INTO rooms (building, room_number, department_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (building, room_number) DO UPDATE SET building = EXCLUDED.building
         RETURNING room_id`,
        [building, room_number, deptId]
      );
      roomMap[key] = res.rows[0].room_id;
    }

    // ── Get or use term ──
    let activeTermId = termId;
    if (!activeTermId) {
      const termRes = await client.query('SELECT term_id FROM terms WHERE is_active = TRUE LIMIT 1');
      if (termRes.rows[0]) activeTermId = termRes.rows[0].term_id;
      else throw new Error('No active term found. Create a term first.');
    }

    // ── Offerings: upsert ──
    const offeringMap = {}; // "course_code|section" → offering_id
    for (const o of data.offerings) {
      let courseId = courseMap[o.course_code] || courseMap[o.course_code?.toUpperCase()];
      if (!courseId && o.course_code) {
        const dbCourse = await client.query('SELECT course_id FROM courses WHERE department_id = $1 AND course_code = $2', [deptId, o.course_code]);
        if (dbCourse.rows[0]) courseId = dbCourse.rows[0].course_id;
      }

      let teacherId = teacherMap[o.staff_no];
      if (!teacherId && o.staff_no) {
        const dbTeacher = await client.query('SELECT teacher_id FROM teachers WHERE department_id = $1 AND staff_no = $2', [deptId, o.staff_no]);
        if (dbTeacher.rows[0]) teacherId = dbTeacher.rows[0].teacher_id;
      }

      if (!courseId || !teacherId) continue;

      const res = await client.query(
        `INSERT INTO course_offerings (course_id, teacher_id, term_id, section)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (course_id, term_id, section) DO UPDATE SET teacher_id = EXCLUDED.teacher_id
         RETURNING offering_id`,
        [courseId, teacherId, activeTermId, o.section || 'A']
      );
      offeringMap[`${o.course_code}|${o.section || 'A'}`] = res.rows[0].offering_id;
      offeringMap[`${o.course_code?.toUpperCase()}|${o.section || 'A'}`] = res.rows[0].offering_id;
    }

    // If no explicit offerings sheet, auto-generate from schedule rows
    if (data.offerings.length === 0 && data.schedules.length > 0) {
      const autoOfferings = new Map();
      for (const s of data.schedules) {
        const key = `${s.course_code}|${s.section || 'A'}`;
        if (!autoOfferings.has(key)) autoOfferings.set(key, s);
      }
      for (const [key, s] of autoOfferings) {
        let courseId = courseMap[s.course_code] || courseMap[s.course_code?.toUpperCase()];
        if (!courseId && s.course_code) {
          const dbCourse = await client.query('SELECT course_id FROM courses WHERE department_id = $1 AND course_code = $2', [deptId, s.course_code]);
          if (dbCourse.rows[0]) courseId = dbCourse.rows[0].course_id;
        }
        if (!courseId) continue;

        let firstTeacher = Object.values(teacherMap)[0];
        if (!firstTeacher) {
          const dbTeacher = await client.query('SELECT teacher_id FROM teachers WHERE department_id = $1 LIMIT 1', [deptId]);
          if (dbTeacher.rows[0]) firstTeacher = dbTeacher.rows[0].teacher_id;
        }
        if (!firstTeacher) continue;

        try {
          const res = await client.query(
            `INSERT INTO course_offerings (course_id, teacher_id, term_id, section)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (course_id, term_id, section) DO NOTHING
             RETURNING offering_id`,
            [courseId, firstTeacher, activeTermId, s.section || 'A']
          );
          if (res.rows[0]) {
            offeringMap[key] = res.rows[0].offering_id;
            offeringMap[`${s.course_code?.toUpperCase()}|${s.section || 'A'}`] = res.rows[0].offering_id;
          } else {
            const existingRes = await client.query(
              `SELECT offering_id FROM course_offerings WHERE course_id = $1 AND term_id = $2 AND section = $3`,
              [courseId, activeTermId, s.section || 'A']
            );
            if (existingRes.rows[0]) {
              offeringMap[key] = existingRes.rows[0].offering_id;
              offeringMap[`${s.course_code?.toUpperCase()}|${s.section || 'A'}`] = existingRes.rows[0].offering_id;
            }
          }
        } catch (e) { /* skip */ }
      }
    }

    // ── Schedule slots ──
    for (const s of data.schedules) {
      const key = `${s.course_code}|${s.section || 'A'}`;
      let offeringId = offeringMap[key] || offeringMap[`${s.course_code?.toUpperCase()}|${s.section || 'A'}`];
      
      if (!offeringId && s.course_code) {
        const dbOffering = await client.query(
          `SELECT co.offering_id 
           FROM course_offerings co
           JOIN courses c ON co.course_id = c.course_id
           WHERE c.department_id = $1 AND c.course_code = $2 AND co.term_id = $3 AND co.section = $4`,
          [deptId, s.course_code, activeTermId, s.section || 'A']
        );
        if (dbOffering.rows[0]) offeringId = dbOffering.rows[0].offering_id;
      }

      if (!offeringId || !s.day || !s.start_time || !s.end_time) continue;

      const roomKey = `${s.building || 'Main'}|${s.room_number}`;
      let roomId = s.room_number ? (roomMap[roomKey] || null) : null;
      if (s.room_number && !roomId) {
        const dbRoom = await client.query('SELECT room_id FROM rooms WHERE building = $1 AND room_number = $2', [s.building || 'Main', s.room_number]);
        if (dbRoom.rows[0]) roomId = dbRoom.rows[0].room_id;
        else {
          const newRoom = await client.query(
            `INSERT INTO rooms (building, room_number, department_id) VALUES ($1, $2, $3) RETURNING room_id`,
            [s.building || 'Main', s.room_number, deptId]
          );
          roomId = newRoom.rows[0].room_id;
        }
      }

      await client.query(
        `INSERT INTO schedule_slots (offering_id, day_of_week, start_time, end_time, room_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [offeringId, s.day, s.start_time, s.end_time, roomId]
      );
    }

    await client.query('COMMIT');
    return { departmentId: deptId, termId: activeTermId };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
