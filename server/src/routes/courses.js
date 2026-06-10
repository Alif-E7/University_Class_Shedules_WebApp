import { Router } from 'express';
import pool from '../db/pool.js';
import { requireDeptAdmin } from '../middleware/auth.js';

const router = Router();

// ── Public: list courses ──
router.get('/', async (req, res) => {
  try {
    const { q, department_id } = req.query;
    let sql = `
      SELECT c.*, d.department_code, d.department_name
      FROM courses c
      JOIN departments d ON c.department_id = d.department_id
      WHERE 1=1`;
    const params = [];

    if (q) {
      params.push(`%${q}%`);
      sql += ` AND (c.course_code ILIKE $${params.length} OR c.course_title ILIKE $${params.length})`;
    }
    if (department_id) {
      params.push(department_id);
      sql += ` AND c.department_id = $${params.length}`;
    }

    sql += ' ORDER BY c.course_code';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// ── Public: course detail ──
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, d.department_code, d.department_name
       FROM courses c
       JOIN departments d ON c.department_id = d.department_id
       WHERE c.course_id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Course not found' });

    const offerings = await pool.query(
      `SELECT co.offering_id, co.section,
              t.teacher_id, t.full_name AS teacher_name, t.staff_no,
              tm.term_id, tm.academic_year, tm.term_name
       FROM course_offerings co
       JOIN teachers t ON t.teacher_id = co.teacher_id
       JOIN terms tm ON tm.term_id = co.term_id
       WHERE co.course_id = $1
       ORDER BY tm.academic_year DESC, tm.term_name, co.section`,
      [req.params.id]
    );

    const schedules = await pool.query(
      `SELECT ss.*, co.section,
              t.full_name AS teacher_name, t.teacher_id,
              r.room_number, r.building
       FROM schedule_slots ss
       JOIN course_offerings co ON co.offering_id = ss.offering_id
       JOIN teachers t ON t.teacher_id = co.teacher_id
       LEFT JOIN rooms r ON r.room_id = ss.room_id
       WHERE co.course_id = $1
       ORDER BY ss.day_of_week, ss.start_time`,
      [req.params.id]
    );

    res.json({ course: rows[0], offerings: offerings.rows, schedules: schedules.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

// ── Admin: create course ──
router.post('/', requireDeptAdmin, async (req, res) => {
  try {
    const deptId = req.user.role === 'dept_admin'
      ? req.user.department_id
      : req.body.department_id;

    if (!deptId) return res.status(400).json({ error: 'department_id required' });

    const { course_code, course_title, credit, year, semester } = req.body;
    if (!course_code || !course_title) {
      return res.status(400).json({ error: 'course_code and course_title required' });
    }

    const { rows } = await pool.query(
      `INSERT INTO courses (department_id, course_code, course_title, credit, year, semester)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [deptId, course_code.toUpperCase(), course_title, credit || 3, year || null, semester || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Course code already exists in this department' });
    console.error(err);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// ── Admin: update course ──
router.put('/:id', requireDeptAdmin, async (req, res) => {
  try {
    if (req.user.role === 'dept_admin') {
      const check = await pool.query('SELECT department_id FROM courses WHERE course_id = $1', [req.params.id]);
      if (!check.rows[0] || check.rows[0].department_id !== req.user.department_id) {
        return res.status(403).json({ error: 'Cannot modify courses outside your department' });
      }
    }

    const { course_code, course_title, credit, year, semester } = req.body;
    const { rows } = await pool.query(
      `UPDATE courses SET course_code = COALESCE($1, course_code), course_title = COALESCE($2, course_title),
                           credit = COALESCE($3, credit), year = COALESCE($4, year),
                           semester = COALESCE($5, semester), updated_at = NOW()
       WHERE course_id = $6 RETURNING *`,
      [course_code?.toUpperCase(), course_title, credit, year, semester, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Course not found' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Course code already exists in this department' });
    console.error(err);
    res.status(500).json({ error: 'Failed to update course' });
  }
});

// ── Admin: delete course ──
router.delete('/:id', requireDeptAdmin, async (req, res) => {
  try {
    if (req.user.role === 'dept_admin') {
      const check = await pool.query('SELECT department_id FROM courses WHERE course_id = $1', [req.params.id]);
      if (!check.rows[0] || check.rows[0].department_id !== req.user.department_id) {
        return res.status(403).json({ error: 'Cannot delete courses outside your department' });
      }
    }
    await pool.query('DELETE FROM courses WHERE course_id = $1', [req.params.id]);
    res.json({ message: 'Course deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

export default router;
