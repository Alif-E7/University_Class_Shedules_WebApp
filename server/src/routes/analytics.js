import { Router } from 'express';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const isDeptAdmin = req.user.role === 'dept_admin';
    const deptId = isDeptAdmin ? req.user.department_id : null;

    let teacherWhere = '';
    let courseWhere = '';
    let slotWhere = '';
    const params = [];

    if (deptId) {
      params.push(deptId);
      teacherWhere = ` WHERE department_id = $${params.length}`;
      courseWhere = ` WHERE department_id = $${params.length}`;
      slotWhere = ` AND c.department_id = $${params.length}`;
    }

    const [teacherCount, courseCount, slotCount, deptCount] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS count FROM teachers${teacherWhere}`, deptId ? [deptId] : []),
      pool.query(`SELECT COUNT(*)::int AS count FROM courses${courseWhere}`, deptId ? [deptId] : []),
      pool.query(
        `SELECT COUNT(*)::int AS count
         FROM schedule_slots ss
         JOIN course_offerings co ON co.offering_id = ss.offering_id
         JOIN courses c ON c.course_id = co.course_id
         WHERE 1=1${slotWhere}`,
        deptId ? [deptId] : []
      ),
      pool.query('SELECT COUNT(*)::int AS count FROM departments'),
    ]);

    // Conflicts: teacher time overlaps
    const conflictSql = `
      SELECT a.slot_id AS slot_a, b.slot_id AS slot_b,
             a.day_of_week, a.start_time AS a_start, a.end_time AS a_end,
             b.start_time AS b_start, b.end_time AS b_end,
             t.full_name AS teacher_name, t.teacher_id,
             c1.course_code AS course_a, c2.course_code AS course_b
      FROM schedule_slots a
      JOIN schedule_slots b ON a.slot_id < b.slot_id
        AND a.day_of_week = b.day_of_week
        AND a.start_time < b.end_time AND b.start_time < a.end_time
      JOIN course_offerings co1 ON co1.offering_id = a.offering_id
      JOIN course_offerings co2 ON co2.offering_id = b.offering_id
        AND co1.teacher_id = co2.teacher_id
      JOIN teachers t ON t.teacher_id = co1.teacher_id
      JOIN courses c1 ON c1.course_id = co1.course_id
      JOIN courses c2 ON c2.course_id = co2.course_id
      ${deptId ? 'WHERE c1.department_id = $1' : ''}
      LIMIT 30`;

    const conflicts = await pool.query(conflictSql, deptId ? [deptId] : []);

    const byDept = await pool.query(
      `SELECT d.department_code, d.department_name,
              COUNT(DISTINCT t.teacher_id)::int AS teachers,
              COUNT(DISTINCT c.course_id)::int AS courses
       FROM departments d
       LEFT JOIN teachers t ON t.department_id = d.department_id
       LEFT JOIN courses c ON c.department_id = d.department_id
       GROUP BY d.department_id
       ORDER BY d.department_code`
    );

    res.json({
      totalTeachers: teacherCount.rows[0].count,
      totalCourses: courseCount.rows[0].count,
      totalSlots: slotCount.rows[0].count,
      totalDepartments: deptCount.rows[0].count,
      conflictCount: conflicts.rows.length,
      conflicts: conflicts.rows,
      departmentStats: byDept.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Dashboard failed' });
  }
});

router.get('/conflicts', requireAuth, async (req, res) => {
  try {
    const isDeptAdmin = req.user.role === 'dept_admin';
    const deptId = isDeptAdmin ? req.user.department_id : null;

    const sql = `
      SELECT a.slot_id AS slot_a, b.slot_id AS slot_b,
             a.day_of_week, a.start_time AS a_start, a.end_time AS a_end,
             b.start_time AS b_start, b.end_time AS b_end,
             t.full_name AS teacher_name, t.teacher_id, t.staff_no,
             c1.course_code AS course_a, c1.course_title AS title_a,
             c2.course_code AS course_b, c2.course_title AS title_b,
             r1.room_number AS room_a, r2.room_number AS room_b
      FROM schedule_slots a
      JOIN schedule_slots b ON a.slot_id < b.slot_id
        AND a.day_of_week = b.day_of_week
        AND a.start_time < b.end_time AND b.start_time < a.end_time
      JOIN course_offerings co1 ON co1.offering_id = a.offering_id
      JOIN course_offerings co2 ON co2.offering_id = b.offering_id
        AND co1.teacher_id = co2.teacher_id
      JOIN teachers t ON t.teacher_id = co1.teacher_id
      JOIN courses c1 ON c1.course_id = co1.course_id
      JOIN courses c2 ON c2.course_id = co2.course_id
      LEFT JOIN rooms r1 ON r1.room_id = a.room_id
      LEFT JOIN rooms r2 ON r2.room_id = b.room_id
      ${deptId ? 'WHERE c1.department_id = $1' : ''}
      ORDER BY t.full_name, a.day_of_week`;

    const { rows } = await pool.query(sql, deptId ? [deptId] : []);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch conflicts' });
  }
});

export default router;
