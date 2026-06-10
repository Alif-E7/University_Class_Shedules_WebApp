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
 * Parse workbook with support for individual sheet imports.
 * Sheets: Departments, Teachers, Courses, Offerings, Schedule
 */
export function parseWorkbook(buffer, uploaderDeptCode = null, importType = 'all') {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const sheetNames = workbook.SheetNames || [];
  if (sheetNames.length === 0) {
    throw new Error('Excel workbook contains no sheets');
  }

  let deptRows = null;
  let teacherRows = null;
  let courseRows = null;
  let offeringRows = null;
  let scheduleRows = null;

  if (importType === 'departments') {
    deptRows = sheetToRows(workbook, 'Departments', 'departments', 'Department', 'department') || XLSX.utils.sheet_to_json(workbook.Sheets[sheetNames[0]], { defval: '' });
  } else if (importType === 'teachers') {
    teacherRows = sheetToRows(workbook, 'Teachers', 'teachers') || XLSX.utils.sheet_to_json(workbook.Sheets[sheetNames[0]], { defval: '' });
  } else if (importType === 'courses') {
    courseRows = sheetToRows(workbook, 'Courses', 'courses') || XLSX.utils.sheet_to_json(workbook.Sheets[sheetNames[0]], { defval: '' });
  } else if (importType === 'offerings') {
    offeringRows = sheetToRows(workbook, 'Offerings', 'offerings') || XLSX.utils.sheet_to_json(workbook.Sheets[sheetNames[0]], { defval: '' });
  } else if (importType === 'schedules') {
    scheduleRows = sheetToRows(workbook, 'Schedule', 'schedule', 'Schedules', 'schedules') || XLSX.utils.sheet_to_json(workbook.Sheets[sheetNames[0]], { defval: '' });
  } else {
    // 'all' — full workbook
    deptRows = sheetToRows(workbook, 'Departments', 'departments', 'Department', 'department');
    teacherRows = sheetToRows(workbook, 'Teachers', 'teachers');
    courseRows = sheetToRows(workbook, 'Courses', 'courses');
    offeringRows = sheetToRows(workbook, 'Offerings', 'offerings');
    scheduleRows = sheetToRows(workbook, 'Schedule', 'schedule', 'Schedules', 'schedules');
  }

  const deptList = deptRows || [];
  const teachersList = teacherRows || [];
  const coursesList = courseRows || [];
  const offeringsList = offeringRows || [];
  const schedulesList = scheduleRows || [];

  if (deptList.length === 0 && teachersList.length === 0 && coursesList.length === 0 && offeringsList.length === 0 && schedulesList.length === 0) {
    throw new Error('Excel file contains no recognizable data rows');
  }

  const errors = [];
  const warnings = [];

  // ── Parse departments ──
  let departmentCode = uploaderDeptCode || null;
  let departmentName = null;
  const departmentsArr = deptList.map((row, i) => {
    const code = pick(row, 'department_code', 'DepartmentCode', 'Code', 'code');
    const name = pick(row, 'department_name', 'DepartmentName', 'Name', 'name');
    if (!code) errors.push(`Departments row ${i + 2}: missing department_code`);
    if (!name) errors.push(`Departments row ${i + 2}: missing department_name`);
    return { department_code: code, department_name: name };
  });

  // Use first department from sheet as default
  if (departmentsArr.length > 0 && departmentsArr[0].department_code) {
    departmentCode = departmentCode || departmentsArr[0].department_code;
    departmentName = departmentsArr[0].department_name;
  }

  // ── Parse teachers ──
  // Expected columns: staff_no, department, full_name, email, office_room
  const teachers = teachersList.map((row, i) => {
    const staff_no = pick(row, 'staff_no', 'StaffNo', 'Staff No', 'ID', 'Id', 'teacher_id', 'TeacherID');
    const full_name = pick(row, 'full_name', 'FullName', 'Name', 'name');
    const email = pick(row, 'Email', 'email');
    const office_room = pick(row, 'office_room', 'OfficeRoom', 'Office Room', 'Room', 'room');
    const designation = pick(row, 'Designation', 'designation');
    const phone = pick(row, 'Phone', 'phone');
    const dept_code = pick(row, 'department', 'Department', 'department_code', 'DepartmentCode') || departmentCode;

    if (!staff_no) errors.push(`Teachers row ${i + 2}: missing staff_no`);
    if (!full_name) errors.push(`Teachers row ${i + 2}: missing full_name`);

    return { staff_no, full_name, email, phone, designation, office_room, department_code: dept_code };
  });

  // ── Parse courses ──
  // Expected columns: course_code, department, course_title, credit, year (1-4), semester (1-2)
  const courses = coursesList.map((row, i) => {
    const course_code = pick(row, 'course_code', 'CourseCode', 'Course Code', 'CourseID', 'course_id', 'ID');
    const course_title = pick(row, 'course_title', 'CourseTitle', 'Title', 'title');
    const credit = parseInt(pick(row, 'credit', 'Credit', 'Credits') || '3', 10);
    const year = parseInt(pick(row, 'year', 'Year') || '0', 10) || null;
    const semester = parseInt(pick(row, 'semester', 'Semester', 'semister', 'Semister') || '0', 10) || null;
    const dept_code = pick(row, 'department', 'Department', 'department_code', 'DepartmentCode') || departmentCode;

    if (!course_code) errors.push(`Courses row ${i + 2}: missing course_code`);
    if (!course_title) errors.push(`Courses row ${i + 2}: missing course_title`);
    if (year && (year < 1 || year > 4)) warnings.push(`Courses row ${i + 2}: year should be 1-4, got ${year}`);
    if (semester && (semester < 1 || semester > 2)) warnings.push(`Courses row ${i + 2}: semester should be 1-2, got ${semester}`);

    return { course_code, course_title, credit, year, semester, department_code: dept_code };
  });

  // ── Parse offerings ──
  // Expected columns: offering_id, course_code, staff_no, term_code
  const offerings = offeringsList.map((row, i) => {
    const offering_id = pick(row, 'offering_id', 'OfferingID', 'Offering ID', 'ID', 'id');
    const course_code = pick(row, 'course_code', 'CourseCode', 'Course Code', 'CourseID');
    const staff_no = pick(row, 'staff_no', 'StaffNo', 'Staff No', 'TeacherID', 'teacher_id');
    const term_code = pick(row, 'term_code', 'TermCode', 'Term Code', 'term', 'Term', 'term_name');
    const section = pick(row, 'section', 'Section') || 'A';
    const dept_code = pick(row, 'department', 'Department', 'department_code', 'DepartmentCode') || departmentCode;

    if (!course_code) errors.push(`Offerings row ${i + 2}: missing course_code`);
    if (!staff_no) errors.push(`Offerings row ${i + 2}: missing staff_no`);

    return { offering_id, course_code, staff_no, term_code, section, department_code: dept_code };
  });

  // ── Parse schedules ──
  // Expected columns: slot_id, offering_id, day_of_week, start_time, end_time, room
  const schedules = schedulesList.map((row, i) => {
    const slot_id = pick(row, 'slot_id', 'SlotID', 'Slot ID');
    const offering_id = pick(row, 'offering_id', 'OfferingID', 'Offering ID');
    const course_code = pick(row, 'course_code', 'CourseCode', 'Course Code', 'CourseID');
    const day = normalizeDay(pick(row, 'day_of_week', 'Day', 'day'));
    const start_time = parseTime(row.start_time ?? row.Start ?? row.start ?? row['Start Time']);
    const end_time = parseTime(row.end_time ?? row.End ?? row.end ?? row['End Time']);
    const room_number = pick(row, 'room', 'Room', 'room_number', 'RoomNumber');
    const building = pick(row, 'Building', 'building') || 'Main';
    const section = pick(row, 'section', 'Section') || 'A';
    const dept_code = pick(row, 'department', 'Department', 'department_code', 'DepartmentCode') || departmentCode;

    if (!day) errors.push(`Schedule row ${i + 2}: missing day_of_week`);
    if (!start_time) errors.push(`Schedule row ${i + 2}: missing start_time`);
    if (!end_time) errors.push(`Schedule row ${i + 2}: missing end_time`);
    if (day && !VALID_DAYS.includes(day)) errors.push(`Schedule row ${i + 2}: invalid day "${day}"`);
    if (!offering_id && !course_code) errors.push(`Schedule row ${i + 2}: need offering_id or course_code`);

    return { slot_id, offering_id, course_code, day, start_time, end_time, room_number, building, section, department_code: dept_code };
  });

  // ── Resolve departmentCode dynamically if still null ──
  if (!departmentCode) {
    const allItems = [...teachers, ...courses, ...offerings, ...schedules];
    for (const item of allItems) {
      if (item.department_code) { departmentCode = item.department_code; break; }
    }
  }

  if (departmentCode) {
    departmentName = departmentName || departmentCode;
    for (const t of teachers) { if (!t.department_code) t.department_code = departmentCode; }
    for (const c of courses) { if (!c.department_code) c.department_code = departmentCode; }
    for (const o of offerings) { if (!o.department_code) o.department_code = departmentCode; }
    for (const s of schedules) { if (!s.department_code) s.department_code = departmentCode; }
  }

  // Check duplicate staff numbers
  const staffKeys = new Map();
  for (const t of teachers) {
    const key = `${t.department_code}|${t.staff_no}`;
    if (staffKeys.has(key)) errors.push(`Duplicate staff_no "${t.staff_no}" in department "${t.department_code}"`);
    staffKeys.set(key, true);
  }

  // Check duplicate course codes
  const courseKeys = new Map();
  for (const c of courses) {
    const key = `${c.department_code}|${c.course_code}`;
    if (courseKeys.has(key)) errors.push(`Duplicate course_code "${c.course_code}" in department "${c.department_code}"`);
    courseKeys.set(key, true);
  }

  // ── Cross-reference validation ──
  const courseCodeSet = new Set(courses.map(c => c.course_code).filter(Boolean));
  const staffNoSet = new Set(teachers.map(t => t.staff_no).filter(Boolean));

  for (const o of offerings) {
    if (courses.length > 0 && o.course_code && !courseCodeSet.has(o.course_code)) {
      warnings.push(`Offering references unknown course: ${o.course_code}`);
    }
    if (teachers.length > 0 && o.staff_no && !staffNoSet.has(o.staff_no)) {
      warnings.push(`Offering references unknown teacher: ${o.staff_no}`);
    }
  }

  // ── Detect time conflicts ──
  const conflicts = detectScheduleConflicts(schedules, offerings, teachers);

  return {
    department: { department_code: departmentCode, department_name: departmentName },
    departments: departmentsArr,
    teachers,
    courses,
    offerings,
    schedules,
    errors,
    warnings,
    conflicts,
    summary: {
      departments: departmentsArr.length,
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
 * Pipeline: departments → teachers → courses → rooms → term → offerings → schedules
 */
export async function commitImportToDb(pool, data, departmentId, termId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Departments: upsert all ──
    const deptIdMap = {}; // department_code → department_id
    if (data.departments && data.departments.length > 0) {
      for (const d of data.departments) {
        if (!d.department_code) continue;
        const res = await client.query(
          `INSERT INTO departments (department_code, department_name)
           VALUES ($1, $2)
           ON CONFLICT (department_code) DO UPDATE SET department_name = COALESCE(EXCLUDED.department_name, departments.department_name)
           RETURNING department_id`,
          [d.department_code.toUpperCase(), d.department_name || d.department_code]
        );
        deptIdMap[d.department_code] = res.rows[0].department_id;
        deptIdMap[d.department_code.toUpperCase()] = res.rows[0].department_id;
      }
    }

    // ── Resolve primary department ──
    let deptId = departmentId;
    if (!deptId && data.department?.department_code) {
      // Check if it was just imported
      if (deptIdMap[data.department.department_code] || deptIdMap[data.department.department_code.toUpperCase()]) {
        deptId = deptIdMap[data.department.department_code] || deptIdMap[data.department.department_code.toUpperCase()];
      } else {
        const res = await client.query(
          `INSERT INTO departments (department_code, department_name)
           VALUES ($1, $2)
           ON CONFLICT (department_code) DO UPDATE SET department_name = COALESCE(EXCLUDED.department_name, departments.department_name)
           RETURNING department_id`,
          [data.department.department_code.toUpperCase(), data.department.department_name || data.department.department_code]
        );
        deptId = res.rows[0].department_id;
      }
    }

    // For teachers/courses that reference different departments, resolve them
    async function resolveDeptId(deptCode) {
      if (!deptCode) return deptId;
      const code = deptCode.toUpperCase();
      if (deptIdMap[code]) return deptIdMap[code];
      // Look up in DB
      const res = await client.query('SELECT department_id FROM departments WHERE department_code = $1', [code]);
      if (res.rows[0]) {
        deptIdMap[code] = res.rows[0].department_id;
        return res.rows[0].department_id;
      }
      return deptId; // fallback
    }

    if (!deptId && Object.keys(deptIdMap).length > 0) {
      deptId = Object.values(deptIdMap)[0];
    }

    // If still no dept and we have data that needs a department, error
    if (!deptId && (data.teachers.length > 0 || data.courses.length > 0)) {
      throw new Error('Cannot determine department for import. Add a Departments sheet or assign a department to the admin user.');
    }

    // ── Teachers: upsert by (department_id, staff_no) ──
    const teacherMap = {}; // staff_no → teacher_id
    for (const t of data.teachers) {
      if (!t.staff_no) continue;
      const tDeptId = await resolveDeptId(t.department_code);
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
        [tDeptId, t.staff_no, t.full_name, t.designation || null, t.email || null, t.phone || null, t.office_room || null]
      );
      teacherMap[t.staff_no] = res.rows[0].teacher_id;
    }

    // ── Courses: upsert by (department_id, course_code) with year + semester ──
    const courseMap = {}; // course_code → course_id
    for (const c of data.courses) {
      if (!c.course_code) continue;
      const cDeptId = await resolveDeptId(c.department_code);
      const res = await client.query(
        `INSERT INTO courses (department_id, course_code, course_title, credit, year, semester)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (department_id, course_code) DO UPDATE SET
           course_title = EXCLUDED.course_title,
           credit = EXCLUDED.credit,
           year = COALESCE(EXCLUDED.year, courses.year),
           semester = COALESCE(EXCLUDED.semester, courses.semester),
           updated_at = NOW()
         RETURNING course_id`,
        [cDeptId, c.course_code.toUpperCase(), c.course_title, c.credit || 3, c.year || null, c.semester || null]
      );
      courseMap[c.course_code] = res.rows[0].course_id;
      courseMap[c.course_code.toUpperCase()] = res.rows[0].course_id;
    }

    // ── Rooms: upsert ──
    const roomMap = {};
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
      else if (data.offerings.length > 0 || data.schedules.length > 0) {
        // Auto-create a default term
        const newTerm = await client.query(
          `INSERT INTO terms (academic_year, term_name, is_active) VALUES ('2025-2026', 'Default', TRUE) RETURNING term_id`
        );
        activeTermId = newTerm.rows[0].term_id;
      }
    }

    // ── Offerings: upsert, track excel offering_id → db offering_id ──
    const offeringMap = {}; // "course_code|section" → offering_id
    const excelOfferingIdMap = {}; // excel offering_id → db offering_id
    for (const o of data.offerings) {
      let courseId = courseMap[o.course_code] || courseMap[o.course_code?.toUpperCase()];
      if (!courseId && o.course_code) {
        const oDeptId = await resolveDeptId(o.department_code);
        const dbCourse = oDeptId
          ? await client.query('SELECT course_id FROM courses WHERE department_id = $1 AND course_code = $2', [oDeptId, o.course_code.toUpperCase()])
          : await client.query('SELECT course_id FROM courses WHERE course_code = $1', [o.course_code.toUpperCase()]);
        if (dbCourse.rows[0]) courseId = dbCourse.rows[0].course_id;
      }

      let teacherId = teacherMap[o.staff_no];
      if (!teacherId && o.staff_no) {
        const oDeptId = await resolveDeptId(o.department_code);
        const dbTeacher = oDeptId
          ? await client.query('SELECT teacher_id FROM teachers WHERE department_id = $1 AND staff_no = $2', [oDeptId, o.staff_no])
          : await client.query('SELECT teacher_id FROM teachers WHERE staff_no = $1', [o.staff_no]);
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
      const dbOfferingId = res.rows[0].offering_id;
      offeringMap[`${o.course_code}|${o.section || 'A'}`] = dbOfferingId;
      offeringMap[`${o.course_code?.toUpperCase()}|${o.section || 'A'}`] = dbOfferingId;
      if (o.offering_id) {
        excelOfferingIdMap[o.offering_id] = dbOfferingId;
      }
    }

    // If no explicit offerings, auto-generate from schedule rows
    if (data.offerings.length === 0 && data.schedules.length > 0) {
      const autoOfferings = new Map();
      for (const s of data.schedules) {
        if (!s.course_code) continue;
        const key = `${s.course_code}|${s.section || 'A'}`;
        if (!autoOfferings.has(key)) autoOfferings.set(key, s);
      }
      for (const [key, s] of autoOfferings) {
        let courseId = courseMap[s.course_code] || courseMap[s.course_code?.toUpperCase()];
         if (!courseId && s.course_code) {
          const sDeptId = await resolveDeptId(s.department_code);
          const dbCourse = sDeptId
            ? await client.query('SELECT course_id FROM courses WHERE department_id = $1 AND course_code = $2', [sDeptId, s.course_code.toUpperCase()])
            : await client.query('SELECT course_id FROM courses WHERE course_code = $1', [s.course_code.toUpperCase()]);
          if (dbCourse.rows[0]) courseId = dbCourse.rows[0].course_id;
        }
        if (!courseId) continue;

        let firstTeacher = Object.values(teacherMap)[0];
        if (!firstTeacher) {
          const dbTeacher = await client.query(
            'SELECT teacher_id FROM teachers WHERE department_id = (SELECT department_id FROM courses WHERE course_id = $1) LIMIT 1',
            [courseId]
          );
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
          } else {
            const existing = await client.query(
              'SELECT offering_id FROM course_offerings WHERE course_id = $1 AND term_id = $2 AND section = $3',
              [courseId, activeTermId, s.section || 'A']
            );
            if (existing.rows[0]) offeringMap[key] = existing.rows[0].offering_id;
          }
        } catch (e) { /* skip */ }
      }
    }

    // ── Schedule slots ──
    for (const s of data.schedules) {
      // Resolve offering_id: first try excel offering_id mapping, then course_code
      let offeringId = null;
      if (s.offering_id && excelOfferingIdMap[s.offering_id]) {
        offeringId = excelOfferingIdMap[s.offering_id];
      }
      if (!offeringId && s.course_code) {
        const key = `${s.course_code}|${s.section || 'A'}`;
        offeringId = offeringMap[key] || offeringMap[`${s.course_code?.toUpperCase()}|${s.section || 'A'}`];
        if (!offeringId) {
          const sDeptId = await resolveDeptId(s.department_code);
          let courseId = null;
          const dbCourse = sDeptId
            ? await client.query('SELECT course_id FROM courses WHERE department_id = $1 AND course_code = $2', [sDeptId, s.course_code.toUpperCase()])
            : await client.query('SELECT course_id FROM courses WHERE course_code = $1', [s.course_code.toUpperCase()]);
          if (dbCourse.rows[0]) courseId = dbCourse.rows[0].course_id;

          if (courseId) {
            const dbOff = await client.query(
              'SELECT offering_id FROM course_offerings WHERE course_id = $1 AND term_id = $2 AND section = $3',
              [courseId, activeTermId, s.section || 'A']
            );
            if (dbOff.rows[0]) offeringId = dbOff.rows[0].offering_id;
          }
        }
      }
      if (!offeringId && s.offering_id) {
        // Try as a real DB offering_id if it is numeric
        if (/^\d+$/.test(s.offering_id)) {
          const dbOff = await client.query('SELECT offering_id FROM course_offerings WHERE offering_id = $1', [parseInt(s.offering_id, 10)]);
          if (dbOff.rows[0]) offeringId = dbOff.rows[0].offering_id;
        } else {
          // Try to look up staging rows from previously committed batches to resolve string offering_id to course/section
          const stagingRes = await client.query(
            `SELECT row_data FROM import_staging_rows 
             WHERE sheet_name = 'offerings' AND row_data->>'offering_id' = $1 AND status = 'committed'
             LIMIT 1`,
            [s.offering_id]
          );
          if (stagingRes.rows[0]) {
            const offData = stagingRes.rows[0].row_data;
            const courseCode = offData.course_code;
            const section = offData.section || 'A';
            const sDeptId = await resolveDeptId(s.department_code);

            let courseId = null;
            const dbCourse = sDeptId
              ? await client.query('SELECT course_id FROM courses WHERE department_id = $1 AND course_code = $2', [sDeptId, courseCode.toUpperCase()])
              : await client.query('SELECT course_id FROM courses WHERE course_code = $1', [courseCode.toUpperCase()]);
            if (dbCourse.rows[0]) courseId = dbCourse.rows[0].course_id;

            if (courseId) {
              const dbOff = await client.query(
                'SELECT offering_id FROM course_offerings WHERE course_id = $1 AND term_id = $2 AND section = $3',
                [courseId, activeTermId, section]
              );
              if (dbOff.rows[0]) offeringId = dbOff.rows[0].offering_id;
            }
          }
        }
      }

      if (!offeringId || !s.day || !s.start_time || !s.end_time) continue;

      const roomKey = `${s.building || 'Main'}|${s.room_number}`;
      let roomId = s.room_number ? (roomMap[roomKey] || null) : null;
      if (s.room_number && !roomId) {
        const dbRoom = await client.query('SELECT room_id FROM rooms WHERE building = $1 AND room_number = $2', [s.building || 'Main', s.room_number]);
        if (dbRoom.rows[0]) roomId = dbRoom.rows[0].room_id;
        else {
          const newRoom = await client.query(
            'INSERT INTO rooms (building, room_number, department_id) VALUES ($1, $2, $3) RETURNING room_id',
            [s.building || 'Main', s.room_number, deptId]
          );
          roomId = newRoom.rows[0].room_id;
        }
      }

      await client.query(
        'INSERT INTO schedule_slots (offering_id, day_of_week, start_time, end_time, room_id) VALUES ($1, $2, $3, $4, $5)',
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

