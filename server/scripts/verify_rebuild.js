
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import child_process from 'child_process';
import pg from 'pg';
import ExcelJS from 'exceljs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve DB config
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'university_schedule',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

const API_URL = 'http://localhost:5000/api';

async function runCommand(cmd, cwd) {
  return new Promise((resolve, reject) => {
    child_process.exec(cmd, { cwd }, (err, stdout, stderr) => {
      if (err) reject(err);
      else resolve({ stdout, stderr });
    });
  });
}

function printHeader(title) {
  console.log(`\n\x1b[35m=== ${title} ===\x1b[0m`);
}

function printPass(msg) {
  console.log(`\x1b[32m✔ PASS: ${msg}\x1b[0m`);
}

function printFail(msg) {
  console.log(`\x1b[31m✘ FAIL: ${msg}\x1b[0m`);
}

async function createConflictingWorkbook(filePath) {
  const wb = new ExcelJS.Workbook();
  const deptSheet = wb.addWorksheet('Department');
  deptSheet.columns = [
    { header: 'department_code', key: 'department_code' },
    { header: 'department_name', key: 'department_name' },
  ];
  deptSheet.addRow({ department_code: 'CSE', department_name: 'Computer Science and Engineering' });

  const teacherSheet = wb.addWorksheet('Teachers');
  teacherSheet.columns = [
    { header: 'staff_no', key: 'staff_no' },
    { header: 'full_name', key: 'full_name' },
  ];
  teacherSheet.addRow({ staff_no: 'CSE-001', full_name: 'Dr. Rahim Ahmed' });

  const courseSheet = wb.addWorksheet('Courses');
  courseSheet.columns = [
    { header: 'course_code', key: 'course_code' },
    { header: 'course_title', key: 'course_title' },
  ];
  courseSheet.addRows([
    { course_code: 'CSE101', course_title: 'Intro to Programming' },
    { course_code: 'CSE201', course_title: 'Data Structures' },
  ]);

  const offeringSheet = wb.addWorksheet('Offerings');
  offeringSheet.columns = [
    { header: 'course_code', key: 'course_code' },
    { header: 'staff_no', key: 'staff_no' },
    { header: 'term', key: 'term' },
    { header: 'section', key: 'section' },
  ];
  offeringSheet.addRows([
    { course_code: 'CSE101', staff_no: 'CSE-001', term: 'Spring', section: 'A' },
    { course_code: 'CSE201', staff_no: 'CSE-001', term: 'Spring', section: 'A' },
  ]);

  const scheduleSheet = wb.addWorksheet('Schedule');
  scheduleSheet.columns = [
    { header: 'course_code', key: 'course_code' },
    { header: 'section', key: 'section' },
    { header: 'day', key: 'day' },
    { header: 'start_time', key: 'start_time' },
    { header: 'end_time', key: 'end_time' },
    { header: 'room_number', key: 'room_number' },
    { header: 'building', key: 'building' },
  ];
  // Overlapping times for the same teacher AND same room
  scheduleSheet.addRows([
    { course_code: 'CSE101', section: 'A', day: 'Sunday', start_time: '09:00', end_time: '10:30', room_number: '501', building: 'Main' },
    { course_code: 'CSE201', section: 'A', day: 'Sunday', start_time: '09:00', end_time: '10:30', room_number: '501', building: 'Main' },
  ]);

  await wb.xlsx.writeFile(filePath);
}

async function verify() {
  try {
    printHeader('RESET DATABASE & INITIALIZE SCHEMA');
    await runCommand('npm run init', path.join(__dirname, '../../db'));
    printPass('Database initialized and seeded (Admin: admin@university.edu / admin123)');

    printHeader('1. CENTRAL ADMIN FLOW');
    // Login
    let res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@university.edu', password: 'admin123' }),
    });
    let data = await res.json();
    if (!res.ok) throw new Error(`Login failed: ${data.error}`);
    const adminToken = data.token;
    printPass('Logged in as Central Admin');

    // Create Departments (CSE and EEE)
    res = await fetch(`${API_URL}/departments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ department_code: 'CSE', department_name: 'Computer Science and Engineering' }),
    });
    const cseDept = await res.json();
    if (res.status !== 201) throw new Error(`Failed to create CSE department: ${cseDept.error}`);
    printPass(`Created CSE Department (ID: ${cseDept.department_id})`);

    res = await fetch(`${API_URL}/departments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ department_code: 'EEE', department_name: 'Electrical and Electronic Engineering' }),
    });
    const eeeDept = await res.json();
    if (res.status !== 201) throw new Error(`Failed to create EEE department: ${eeeDept.error}`);
    printPass(`Created EEE Department (ID: ${eeeDept.department_id})`);

    // Create Department Admins (cse_admin and eee_admin)
    res = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        username: 'cse_admin',
        email: 'cse_admin@university.edu',
        password: 'cse1234password',
        role: 'dept_admin',
        department_id: cseDept.department_id,
      }),
    });
    const cseUser = await res.json();
    if (res.status !== 201) throw new Error(`Failed to create CSE Admin: ${cseUser.error}`);
    printPass('Created CSE Department Office Account (cse_admin@university.edu)');

    res = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        username: 'eee_admin',
        email: 'eee_admin@university.edu',
        password: 'eee1234password',
        role: 'dept_admin',
        department_id: eeeDept.department_id,
      }),
    });
    const eeeUser = await res.json();
    if (res.status !== 201) throw new Error(`Failed to create EEE Admin: ${eeeUser.error}`);
    printPass('Created EEE Department Office Account (eee_admin@university.edu)');

    // Verify Active Terms
    res = await fetch(`${API_URL}/terms`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const terms = await res.json();
    const activeTerm = terms.find(t => t.is_active);
    if (!activeTerm) throw new Error('No active term found after seeding');
    printPass(`Found Active Term: ${activeTerm.academic_year} ${activeTerm.term_name} (ID: ${activeTerm.term_id})`);

    printHeader('2. DEPARTMENT SCOPING & AUTHORIZATION CHECKS');
    // Login as CSE Admin
    res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'cse_admin@university.edu', password: 'cse1234password' }),
    });
    const cseAdminData = await res.json();
    if (!res.ok) throw new Error(`CSE Admin login failed: ${cseAdminData.error}`);
    const cseToken = cseAdminData.token;
    printPass('Logged in as CSE Admin');

    // Scoping check: CSE admin tries to access users list (should fail)
    res = await fetch(`${API_URL}/users`, {
      headers: { Authorization: `Bearer ${cseToken}` },
    });
    if (res.status === 403) {
      printPass('CSE Admin forbidden from listing users (central admin only)');
    } else {
      throw new Error(`CSE Admin listing users succeeded with status: ${res.status}`);
    }

    // Scoping check: CSE admin tries to create a department (should fail)
    res = await fetch(`${API_URL}/departments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cseToken}` },
      body: JSON.stringify({ department_code: 'MGT', department_name: 'Management' }),
    });
    if (res.status === 403) {
      printPass('CSE Admin forbidden from creating a department (central admin only)');
    } else {
      throw new Error(`CSE Admin department creation succeeded with status: ${res.status}`);
    }

    printHeader('3. EXCEL IMPORT PIPELINE (CSE DEPT ADMIN FLOW)');
    // Regenerate fresh demo workbooks
    await runCommand('npm run seed:excel', path.join(__dirname, '..'));

    // Upload CSE file
    const cseFilePath = path.join(__dirname, '../sample-data/demo_cse_schedule.xlsx');
    const cseFileBuffer = fs.readFileSync(cseFilePath);
    const cseForm = new FormData();
    const cseBlob = new Blob([cseFileBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    cseForm.append('file', cseBlob, 'demo_cse_schedule.xlsx');

    res = await fetch(`${API_URL}/import/preview`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cseToken}` },
      body: cseForm,
    });
    let previewData = await res.json();
    if (!res.ok) throw new Error(`CSE file upload preview failed: ${previewData.error}`);
    printPass(`CSE Workbook upload previewed. Batch ID: ${previewData.batch_id}`);
    
    // Check preview returns correct summary
    if (previewData.summary.teachers === 4 && previewData.summary.courses === 6) {
      printPass('CSE Workbook preview matches expected summary counts (4 teachers, 6 courses)');
    } else {
      throw new Error(`CSE Workbook preview summary mismatch: ${JSON.stringify(previewData.summary)}`);
    }

    // Confirm/commit CSE import
    res = await fetch(`${API_URL}/import/confirm/${previewData.batch_id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cseToken}` },
      body: JSON.stringify({ term_id: activeTerm.term_id }),
    });
    let commitData = await res.json();
    if (!res.ok) throw new Error(`CSE batch confirm failed: ${commitData.error}`);
    printPass('CSE batch committed successfully to database');

    printHeader('4. PUBLIC PORTAL VIEW VERIFICATION (BEFORE EEE IMPORT)');
    // Fetch departments list
    res = await fetch(`${API_URL}/departments`);
    let publicDepts = await res.json();
    let csePublic = publicDepts.find(d => d.department_code === 'CSE');
    let eeePublic = publicDepts.find(d => d.department_code === 'EEE');
    if (csePublic.faculty_count === 4 && csePublic.course_count === 6) {
      printPass('Public Portal: CSE department counts show 4 faculty and 6 courses');
    } else {
      throw new Error(`Public Portal CSE counts mismatch: ${JSON.stringify(csePublic)}`);
    }
    if (eeePublic.faculty_count === 0 && eeePublic.course_count === 0) {
      printPass('Public Portal: EEE department counts show 0 faculty and 0 courses');
    } else {
      throw new Error(`Public Portal EEE counts mismatch: ${JSON.stringify(eeePublic)}`);
    }

    // Fetch teachers list
    res = await fetch(`${API_URL}/teachers`);
    let publicTeachers = await res.json();
    const cseTeachersCount = publicTeachers.filter(t => t.department_code === 'CSE').length;
    if (cseTeachersCount === 4) {
      printPass('Public Portal: Listed all 4 CSE teachers');
    } else {
      throw new Error(`Public Portal CSE teachers count mismatch: ${cseTeachersCount}`);
    }

    // Fetch courses list
    res = await fetch(`${API_URL}/courses`);
    let publicCourses = await res.json();
    const cseCoursesCount = publicCourses.filter(c => c.department_code === 'CSE').length;
    if (cseCoursesCount === 6) {
      printPass('Public Portal: Listed all 6 CSE courses');
    } else {
      throw new Error(`Public Portal CSE courses count mismatch: ${cseCoursesCount}`);
    }

    // Fetch weekly schedules
    res = await fetch(`${API_URL}/schedules/weekly?department_id=${cseDept.department_id}&term_id=${activeTerm.term_id}`);
    let cseWeekly = await res.json();
    if (cseWeekly && Object.keys(cseWeekly).length > 0) {
      printPass('Public Portal: Timetable grid has active schedule slots for CSE');
    } else {
      throw new Error('Public Portal: CSE weekly timetable grid was empty');
    }

    printHeader('5. EXCEL IMPORT PIPELINE (EEE DEPT ADMIN FLOW)');
    // Login as EEE Admin
    res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'eee_admin@university.edu', password: 'eee1234password' }),
    });
    const eeeAdminData = await res.json();
    if (!res.ok) throw new Error(`EEE Admin login failed: ${eeeAdminData.error}`);
    const eeeToken = eeeAdminData.token;
    printPass('Logged in as EEE Admin');

    // Upload EEE file
    const eeeFilePath = path.join(__dirname, '../sample-data/demo_eee_schedule.xlsx');
    const eeeFileBuffer = fs.readFileSync(eeeFilePath);
    const eeeForm = new FormData();
    const eeeBlob = new Blob([eeeFileBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    eeeForm.append('file', eeeBlob, 'demo_eee_schedule.xlsx');

    res = await fetch(`${API_URL}/import/preview`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${eeeToken}` },
      body: eeeForm,
    });
    previewData = await res.json();
    if (!res.ok) throw new Error(`EEE file upload preview failed: ${previewData.error}`);
    printPass(`EEE Workbook upload previewed. Batch ID: ${previewData.batch_id}`);

    // Confirm/commit EEE import
    res = await fetch(`${API_URL}/import/confirm/${previewData.batch_id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${eeeToken}` },
      body: JSON.stringify({ term_id: activeTerm.term_id }),
    });
    commitData = await res.json();
    if (!res.ok) throw new Error(`EEE batch confirm failed: ${commitData.error}`);
    printPass('EEE batch committed successfully to database');

    printHeader('6. NAME COLLISION & SCOPING INTEGRITY TEST');
    // Verify name collision of "Dr. Rahim"
    const teachersResult = await pool.query(
      `SELECT t.*, d.department_code
       FROM teachers t
       JOIN departments d ON t.department_id = d.department_id
       WHERE t.full_name ILIKE '%Rahim%'`
    );
    if (teachersResult.rows.length === 2) {
      const cseRahim = teachersResult.rows.find(t => t.department_code === 'CSE');
      const eeeRahim = teachersResult.rows.find(t => t.department_code === 'EEE');
      
      if (cseRahim && eeeRahim && cseRahim.teacher_id !== eeeRahim.teacher_id) {
        printPass(`Name collision handles correctly:
          - CSE Rahim staff_no="${cseRahim.staff_no}" ID=${cseRahim.teacher_id}
          - EEE Rahim staff_no="${eeeRahim.staff_no}" ID=${eeeRahim.teacher_id}
          Both exist independently without collision or data corruption.`);
      } else {
        throw new Error('Name collision teachers have duplicate IDs or corrupt data');
      }
    } else {
      throw new Error(`Expected exactly 2 teachers containing "Rahim", found: ${teachersResult.rows.length}`);
    }

    // Scoping check: EEE admin tries to update CSE Rahim (should fail with 403)
    const cseRahimId = teachersResult.rows.find(t => t.department_code === 'CSE').teacher_id;
    res = await fetch(`${API_URL}/teachers/${cseRahimId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${eeeToken}` },
      body: JSON.stringify({ full_name: 'Dr. Rahim Compromised' }),
    });
    if (res.status === 403) {
      printPass('EEE Admin forbidden from updating CSE teacher details (403 Forbidden)');
    } else {
      throw new Error(`EEE Admin was able to update CSE teacher with status: ${res.status}`);
    }

    printHeader('7. CONFLICT DETECTION PIPELINE TEST');
    const conflictFilePath = path.join(__dirname, '../sample-data/demo_conflict_schedule.xlsx');
    await createConflictingWorkbook(conflictFilePath);
    printPass('Generated conflicting workbook (demo_conflict_schedule.xlsx)');

    // Upload conflicting CSE sheet
    const conflictFileBuffer = fs.readFileSync(conflictFilePath);
    const conflictForm = new FormData();
    const conflictBlob = new Blob([conflictFileBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    conflictForm.append('file', conflictBlob, 'demo_conflict_schedule.xlsx');

    res = await fetch(`${API_URL}/import/preview`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cseToken}` },
      body: conflictForm,
    });
    previewData = await res.json();
    if (!res.ok) throw new Error(`Conflicting file upload failed: ${previewData.error}`);

    const teacherOverlap = previewData.conflicts.find(c => c.type === 'teacher_overlap');
    const roomOverlap = previewData.conflicts.find(c => c.type === 'room_overlap');

    if (teacherOverlap && roomOverlap) {
      printPass(`Conflicts detected successfully in staging preview:
        - Teacher conflict: ${teacherOverlap.message}
        - Room conflict: ${roomOverlap.message}`);
    } else {
      throw new Error(`Expected teacher and room conflicts, got: ${JSON.stringify(previewData.conflicts)}`);
    }

    // Clean up temp conflict file
    try { fs.unlinkSync(conflictFilePath); } catch (e) {}

    console.log('\n\x1b[32;1m=== ALL VERIFICATION FLOWS COMPLETED SUCCESSFULLY! ===\x1b[0m\n');
    process.exit(0);

  } catch (err) {
    printFail(err.message);
    console.error(err);
    process.exit(1);
  }
}

verify();
