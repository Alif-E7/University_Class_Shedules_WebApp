import { Router } from 'express';
import XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import pool from '../db/pool.js';

const router = Router();

router.get('/excel/teacher/:id', async (req, res) => {
  const teacher = await pool.query(
    `SELECT t.*, d.department_code, d.department_name
     FROM teachers t
     JOIN departments d ON d.department_id = t.department_id
     WHERE t.teacher_id = $1`,
    [req.params.id]
  );
  if (!teacher.rows[0]) return res.status(404).json({ error: 'Not found' });

  const schedules = await pool.query(
    `SELECT ss.day_of_week AS day, ss.start_time, ss.end_time,
            c.course_code, c.course_title, co.section,
            r.room_number, r.building
     FROM schedule_slots ss
     JOIN course_offerings co ON co.offering_id = ss.offering_id
     JOIN courses c ON c.course_id = co.course_id
     LEFT JOIN rooms r ON r.room_id = ss.room_id
     WHERE co.teacher_id = $1
     ORDER BY ss.day_of_week, ss.start_time`,
    [req.params.id]
  );

  const wb = XLSX.utils.book_new();
  const info = XLSX.utils.json_to_sheet([teacher.rows[0]]);
  const sched = XLSX.utils.json_to_sheet(schedules.rows);
  XLSX.utils.book_append_sheet(wb, info, 'Teacher');
  XLSX.utils.book_append_sheet(wb, sched, 'Schedule');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', `attachment; filename=teacher-${req.params.id}.xlsx`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

router.get('/pdf/teacher/:id', async (req, res) => {
  const teacher = await pool.query(
    `SELECT t.*, d.department_code, d.department_name
     FROM teachers t
     JOIN departments d ON d.department_id = t.department_id
     WHERE t.teacher_id = $1`,
    [req.params.id]
  );
  if (!teacher.rows[0]) return res.status(404).json({ error: 'Not found' });

  const schedules = await pool.query(
    `SELECT ss.day_of_week AS day, ss.start_time, ss.end_time,
            c.course_code, c.course_title, co.section,
            r.room_number
     FROM schedule_slots ss
     JOIN course_offerings co ON co.offering_id = ss.offering_id
     JOIN courses c ON c.course_id = co.course_id
     LEFT JOIN rooms r ON r.room_id = ss.room_id
     WHERE co.teacher_id = $1
     ORDER BY ss.day_of_week, ss.start_time`,
    [req.params.id]
  );

  const t = teacher.rows[0];
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=schedule-${t.staff_no}.pdf`);

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  doc.fontSize(20).text('Class Schedule', { align: 'center' });
  doc.moveDown();
  doc.fontSize(14).text(t.full_name);
  doc.text(`Staff No: ${t.staff_no}`);
  doc.text(`Department: ${t.department_name} (${t.department_code})`);
  doc.text(`Email: ${t.email || 'N/A'}`);
  doc.moveDown();

  let currentDay = '';
  for (const s of schedules.rows) {
    if (s.day !== currentDay) {
      currentDay = s.day;
      doc.moveDown().fontSize(12).text(currentDay, { underline: true });
    }
    const start = String(s.start_time).slice(0, 5);
    const end = String(s.end_time).slice(0, 5);
    doc.fontSize(10).text(`${start}-${end}  ${s.course_code} - ${s.course_title} [${s.section}] (Room ${s.room_number || 'TBA'})`);
  }

  doc.end();
});

export default router;
