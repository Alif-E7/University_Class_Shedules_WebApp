import { Router } from 'express';
import pool from '../db/pool.js';
import { requireCentralAdmin } from '../middleware/auth.js';

const router = Router();

// ── Public ──

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT d.*,
              (SELECT COUNT(*) FROM teachers t WHERE t.department_id = d.department_id)::int AS faculty_count,
              (SELECT COUNT(*) FROM courses c WHERE c.department_id = d.department_id)::int AS course_count
       FROM departments d
       ORDER BY d.department_code`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const dept = await pool.query('SELECT * FROM departments WHERE department_id = $1', [req.params.id]);
    if (!dept.rows[0]) return res.status(404).json({ error: 'Department not found' });

    const teachers = await pool.query(
      `SELECT teacher_id, staff_no, full_name, designation, email
       FROM teachers WHERE department_id = $1 ORDER BY full_name`,
      [req.params.id]
    );

    const courses = await pool.query(
      `SELECT course_id, course_code, course_title, credit, semester
       FROM courses WHERE department_id = $1 ORDER BY course_code`,
      [req.params.id]
    );

    const slotCount = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM schedule_slots ss
       JOIN course_offerings co ON co.offering_id = ss.offering_id
       JOIN courses c ON c.course_id = co.course_id
       WHERE c.department_id = $1`,
      [req.params.id]
    );

    res.json({
      department: dept.rows[0],
      stats: {
        faculty: teachers.rows.length,
        courses: courses.rows.length,
        classesPerWeek: slotCount.rows[0].total,
      },
      teachers: teachers.rows,
      courses: courses.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch department' });
  }
});

// ── Central admin only ──

router.post('/', requireCentralAdmin, async (req, res) => {
  try {
    const { department_code, department_name, office_email } = req.body;
    if (!department_code || !department_name) {
      return res.status(400).json({ error: 'department_code and department_name required' });
    }
    const { rows } = await pool.query(
      `INSERT INTO departments (department_code, department_name, office_email)
       VALUES ($1, $2, $3) RETURNING *`,
      [department_code.toUpperCase(), department_name, office_email || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Department code already exists' });
    console.error(err);
    res.status(500).json({ error: 'Failed to create department' });
  }
});

router.put('/:id', requireCentralAdmin, async (req, res) => {
  try {
    const { department_code, department_name, office_email } = req.body;
    const { rows } = await pool.query(
      `UPDATE departments SET department_code = COALESCE($1, department_code),
                               department_name = COALESCE($2, department_name),
                               office_email = COALESCE($3, office_email)
       WHERE department_id = $4 RETURNING *`,
      [department_code?.toUpperCase(), department_name, office_email, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Department not found' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Department code already exists' });
    console.error(err);
    res.status(500).json({ error: 'Failed to update department' });
  }
});

router.delete('/:id', requireCentralAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM departments WHERE department_id = $1', [req.params.id]);
    res.json({ message: 'Department deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

export default router;
