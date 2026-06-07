import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function generate() {
  const outDir = path.join(__dirname, '..', 'sample-data');
  fs.mkdirSync(outDir, { recursive: true });

  // ── CSE Department Workbook ──
  const cseWb = new ExcelJS.Workbook();

  const deptSheet = cseWb.addWorksheet('Department');
  deptSheet.columns = [
    { header: 'department_code', key: 'department_code', width: 20 },
    { header: 'department_name', key: 'department_name', width: 40 },
  ];
  deptSheet.addRow({ department_code: 'CSE', department_name: 'Computer Science and Engineering' });

  const teacherSheet = cseWb.addWorksheet('Teachers');
  teacherSheet.columns = [
    { header: 'staff_no', key: 'staff_no', width: 15 },
    { header: 'full_name', key: 'full_name', width: 25 },
    { header: 'designation', key: 'designation', width: 20 },
    { header: 'email', key: 'email', width: 30 },
    { header: 'phone', key: 'phone', width: 15 },
    { header: 'office_room', key: 'office_room', width: 15 },
  ];
  teacherSheet.addRows([
    { staff_no: 'CSE-001', full_name: 'Dr. Rahim Ahmed', designation: 'Professor', email: 'rahim@univ.edu', phone: '01711111111', office_room: 'A-301' },
    { staff_no: 'CSE-002', full_name: 'Dr. Fatima Khan', designation: 'Associate Professor', email: 'fatima@univ.edu', phone: '01722222222', office_room: 'A-302' },
    { staff_no: 'CSE-003', full_name: 'Mr. Karim Hossain', designation: 'Lecturer', email: 'karim@univ.edu', phone: '01733333333', office_room: 'A-305' },
    { staff_no: 'CSE-004', full_name: 'Dr. Nusrat Jahan', designation: 'Assistant Professor', email: 'nusrat@univ.edu', phone: '01744444444', office_room: 'A-306' },
  ]);

  const courseSheet = cseWb.addWorksheet('Courses');
  courseSheet.columns = [
    { header: 'course_code', key: 'course_code', width: 15 },
    { header: 'course_title', key: 'course_title', width: 35 },
    { header: 'credit', key: 'credit', width: 10 },
    { header: 'semester', key: 'semester', width: 15 },
  ];
  courseSheet.addRows([
    { course_code: 'CSE101', course_title: 'Introduction to Programming', credit: 3, semester: '1-1' },
    { course_code: 'CSE201', course_title: 'Data Structures', credit: 3, semester: '2-1' },
    { course_code: 'CSE301', course_title: 'Algorithms', credit: 3, semester: '3-1' },
    { course_code: 'CSE220', course_title: 'Database Systems', credit: 3, semester: '2-2' },
    { course_code: 'CSE310', course_title: 'Operating Systems', credit: 3, semester: '3-1' },
    { course_code: 'CSE401', course_title: 'Machine Learning', credit: 3, semester: '4-1' },
  ]);

  const offeringSheet = cseWb.addWorksheet('Offerings');
  offeringSheet.columns = [
    { header: 'course_code', key: 'course_code', width: 15 },
    { header: 'staff_no', key: 'staff_no', width: 15 },
    { header: 'term', key: 'term', width: 15 },
    { header: 'section', key: 'section', width: 10 },
  ];
  offeringSheet.addRows([
    { course_code: 'CSE101', staff_no: 'CSE-003', term: 'Spring', section: 'A' },
    { course_code: 'CSE101', staff_no: 'CSE-003', term: 'Spring', section: 'B' },
    { course_code: 'CSE201', staff_no: 'CSE-001', term: 'Spring', section: 'A' },
    { course_code: 'CSE301', staff_no: 'CSE-001', term: 'Spring', section: 'A' },
    { course_code: 'CSE220', staff_no: 'CSE-002', term: 'Spring', section: 'A' },
    { course_code: 'CSE310', staff_no: 'CSE-004', term: 'Spring', section: 'A' },
    { course_code: 'CSE401', staff_no: 'CSE-002', term: 'Spring', section: 'A' },
  ]);

  const scheduleSheet = cseWb.addWorksheet('Schedule');
  scheduleSheet.columns = [
    { header: 'course_code', key: 'course_code', width: 15 },
    { header: 'section', key: 'section', width: 10 },
    { header: 'day', key: 'day', width: 12 },
    { header: 'start_time', key: 'start_time', width: 12 },
    { header: 'end_time', key: 'end_time', width: 12 },
    { header: 'room_number', key: 'room_number', width: 12 },
    { header: 'building', key: 'building', width: 15 },
  ];
  scheduleSheet.addRows([
    { course_code: 'CSE101', section: 'A', day: 'Sunday', start_time: '09:00', end_time: '10:30', room_number: '501', building: 'Main' },
    { course_code: 'CSE101', section: 'A', day: 'Tuesday', start_time: '09:00', end_time: '10:30', room_number: '501', building: 'Main' },
    { course_code: 'CSE101', section: 'B', day: 'Sunday', start_time: '11:00', end_time: '12:30', room_number: '502', building: 'Main' },
    { course_code: 'CSE101', section: 'B', day: 'Wednesday', start_time: '11:00', end_time: '12:30', room_number: '502', building: 'Main' },
    { course_code: 'CSE201', section: 'A', day: 'Monday', start_time: '09:00', end_time: '10:30', room_number: '503', building: 'Main' },
    { course_code: 'CSE201', section: 'A', day: 'Wednesday', start_time: '09:00', end_time: '10:30', room_number: '503', building: 'Main' },
    { course_code: 'CSE301', section: 'A', day: 'Sunday', start_time: '14:00', end_time: '15:30', room_number: '504', building: 'Main' },
    { course_code: 'CSE301', section: 'A', day: 'Thursday', start_time: '14:00', end_time: '15:30', room_number: '504', building: 'Main' },
    { course_code: 'CSE220', section: 'A', day: 'Monday', start_time: '11:00', end_time: '12:30', room_number: '505', building: 'Main' },
    { course_code: 'CSE220', section: 'A', day: 'Thursday', start_time: '11:00', end_time: '12:30', room_number: '505', building: 'Main' },
    { course_code: 'CSE310', section: 'A', day: 'Tuesday', start_time: '14:00', end_time: '15:30', room_number: '506', building: 'Main' },
    { course_code: 'CSE310', section: 'A', day: 'Thursday', start_time: '09:00', end_time: '10:30', room_number: '506', building: 'Main' },
    { course_code: 'CSE401', section: 'A', day: 'Monday', start_time: '14:00', end_time: '15:30', room_number: '507', building: 'Main' },
    { course_code: 'CSE401', section: 'A', day: 'Wednesday', start_time: '14:00', end_time: '15:30', room_number: '507', building: 'Main' },
  ]);

  await cseWb.xlsx.writeFile(path.join(outDir, 'demo_cse_schedule.xlsx'));
  console.log('Created: sample-data/demo_cse_schedule.xlsx');

  // ── EEE Department Workbook ──
  const eeeWb = new ExcelJS.Workbook();

  const eeeDeptSheet = eeeWb.addWorksheet('Department');
  eeeDeptSheet.columns = deptSheet.columns;
  eeeDeptSheet.addRow({ department_code: 'EEE', department_name: 'Electrical and Electronic Engineering' });

  const eeeTeacherSheet = eeeWb.addWorksheet('Teachers');
  eeeTeacherSheet.columns = teacherSheet.columns;
  eeeTeacherSheet.addRows([
    { staff_no: 'EEE-001', full_name: 'Dr. Rahim Uddin', designation: 'Professor', email: 'rahim.eee@univ.edu', phone: '01755555555', office_room: 'B-201' },
    { staff_no: 'EEE-002', full_name: 'Dr. Sultana Begum', designation: 'Associate Professor', email: 'sultana@univ.edu', phone: '01766666666', office_room: 'B-202' },
    { staff_no: 'EEE-003', full_name: 'Mr. Arif Islam', designation: 'Lecturer', email: 'arif@univ.edu', phone: '01777777777', office_room: 'B-205' },
  ]);

  const eeeCourseSheet = eeeWb.addWorksheet('Courses');
  eeeCourseSheet.columns = courseSheet.columns;
  eeeCourseSheet.addRows([
    { course_code: 'EEE101', course_title: 'Circuit Analysis', credit: 3, semester: '1-1' },
    { course_code: 'EEE201', course_title: 'Digital Electronics', credit: 3, semester: '2-1' },
    { course_code: 'EEE301', course_title: 'Power Systems', credit: 3, semester: '3-1' },
    { course_code: 'EEE202', course_title: 'Programming Fundamentals', credit: 3, semester: '2-1' },
  ]);

  const eeeOfferingSheet = eeeWb.addWorksheet('Offerings');
  eeeOfferingSheet.columns = offeringSheet.columns;
  eeeOfferingSheet.addRows([
    { course_code: 'EEE101', staff_no: 'EEE-003', term: 'Spring', section: 'A' },
    { course_code: 'EEE201', staff_no: 'EEE-001', term: 'Spring', section: 'A' },
    { course_code: 'EEE301', staff_no: 'EEE-002', term: 'Spring', section: 'A' },
    { course_code: 'EEE202', staff_no: 'EEE-001', term: 'Spring', section: 'A' },
  ]);

  const eeeScheduleSheet = eeeWb.addWorksheet('Schedule');
  eeeScheduleSheet.columns = scheduleSheet.columns;
  eeeScheduleSheet.addRows([
    { course_code: 'EEE101', section: 'A', day: 'Sunday', start_time: '09:00', end_time: '10:30', room_number: '301', building: 'EEE Block' },
    { course_code: 'EEE101', section: 'A', day: 'Tuesday', start_time: '09:00', end_time: '10:30', room_number: '301', building: 'EEE Block' },
    { course_code: 'EEE201', section: 'A', day: 'Monday', start_time: '09:00', end_time: '10:30', room_number: '302', building: 'EEE Block' },
    { course_code: 'EEE201', section: 'A', day: 'Wednesday', start_time: '09:00', end_time: '10:30', room_number: '302', building: 'EEE Block' },
    { course_code: 'EEE301', section: 'A', day: 'Sunday', start_time: '11:00', end_time: '12:30', room_number: '303', building: 'EEE Block' },
    { course_code: 'EEE301', section: 'A', day: 'Thursday', start_time: '11:00', end_time: '12:30', room_number: '303', building: 'EEE Block' },
    { course_code: 'EEE202', section: 'A', day: 'Tuesday', start_time: '14:00', end_time: '15:30', room_number: '304', building: 'EEE Block' },
    { course_code: 'EEE202', section: 'A', day: 'Thursday', start_time: '14:00', end_time: '15:30', room_number: '304', building: 'EEE Block' },
  ]);

  await eeeWb.xlsx.writeFile(path.join(outDir, 'demo_eee_schedule.xlsx'));
  console.log('Created: sample-data/demo_eee_schedule.xlsx');
  console.log('\nBoth CSE & EEE demo workbooks generated. Note: both have a "Dr. Rahim" — different IDs, different departments.');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
