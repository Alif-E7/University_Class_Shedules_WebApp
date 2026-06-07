import { Router } from 'express';
import pool from '../db/pool.js';

const router = Router();

router.get('/homepage', async (req, res) => {
  try {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const now = new Date();
    const today = days[now.getDay()];
    const dateLabel = now.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const { rows: classes } = await pool.query(
      `SELECT ss.slot_id, ss.day_of_week, ss.start_time, ss.end_time,
              co.offering_id, co.section,
              c.course_id, c.course_code, c.course_title, c.credit,
              COALESCE(NULLIF(c.semester, ''), 'General') AS batch,
              t.teacher_id, t.full_name AS teacher_name, t.designation, t.staff_no,
              r.room_number, r.building,
              d.department_id, d.department_code, d.department_name
       FROM schedule_slots ss
       JOIN course_offerings co ON co.offering_id = ss.offering_id
       JOIN courses c ON c.course_id = co.course_id
       JOIN teachers t ON t.teacher_id = co.teacher_id
       JOIN departments d ON d.department_id = c.department_id
       JOIN terms tm ON tm.term_id = co.term_id
       LEFT JOIN rooms r ON r.room_id = ss.room_id
       WHERE ss.day_of_week = $1 AND tm.is_active = TRUE
       ORDER BY ss.start_time`,
      [today]
    );

    // Group by department
    const byDepartment = {};
    const deptInfo = {};
    for (const c of classes) {
      const key = c.department_code || 'General';
      if (!byDepartment[key]) byDepartment[key] = [];
      byDepartment[key].push(c);
      if (!deptInfo[key]) deptInfo[key] = { department_id: c.department_id, department_name: c.department_name };
    }

    // Get all departments with their batches
    const { rows: batchRows } = await pool.query(
      `SELECT DISTINCT d.department_code, c.semester AS batch
       FROM courses c
       JOIN departments d ON c.department_id = d.department_id
       WHERE c.semester IS NOT NULL AND TRIM(c.semester) <> ''
       ORDER BY d.department_code, c.semester`
    );

    const departments = {};
    for (const row of batchRows) {
      const code = row.department_code;
      if (!departments[code]) departments[code] = [];
      if (!departments[code].includes(row.batch)) departments[code].push(row.batch);
    }

    // Group by batch
    const batchSet = new Set(classes.map(c => c.batch).filter(b => b && b !== 'General'));
    const activeBatches = [...batchSet].sort();
    const byBatch = {};
    for (const batch of activeBatches) {
      byBatch[batch] = classes.filter(c => c.batch === batch);
    }

    // Get department list for public display
    const { rows: allDepts } = await pool.query(
      `SELECT d.*, 
              (SELECT COUNT(*) FROM teachers t WHERE t.department_id = d.department_id)::int AS faculty_count,
              (SELECT COUNT(*) FROM courses c WHERE c.department_id = d.department_id)::int AS course_count
       FROM departments d ORDER BY d.department_code`
    );

    res.json({
      day: today,
      dateLabel,
      departments: Object.keys(departments).length ? departments : {},
      byDepartment,
      activeBatches,
      byBatch,
      classes,
      allDepartments: allDepts,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load homepage data' });
  }
});

export default router;
