import { Router } from 'express';
import pool from '../db/pool.js';
import { requireDeptAdmin } from '../middleware/auth.js';

const router = Router();

// ── Public: list offerings ──
router.get('/', async (req, res) => {
  try {
    const { department_id, term_id, teacher_id } = req.query;
    let sql = `
      SELECT co.*, c.course_code, c.course_title, c.credit,
             t.staff_no, t.full_name AS teacher_name,
             tm.academic_year, tm.term_name,
             d.department_code, d.department_name
      FROM course_offerings co
      JOIN courses c ON c.course_id = co.course_id
      JOIN teachers t ON t.teacher_id = co.teacher_id
      JOIN terms tm ON tm.term_id = co.term_id
      JOIN departments d ON d.department_id = c.department_id
      WHERE 1=1`;
    const params = [];

    if (department_id) {
      params.push(department_id);
      sql += ` AND c.department_id = $${params.length}`;
    }
    if (term_id) {
      params.push(term_id);
      sql += ` AND co.term_id = $${params.length}`;
    }
    if (teacher_id) {
      params.push(teacher_id);
      sql += ` AND co.teacher_id = $${params.length}`;
    }

    sql += ' ORDER BY d.department_code, c.course_code, co.section';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch offerings' });
  }
});

// ── Public: offering detail with schedule ──
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT co.*, c.course_code, c.course_title, c.credit,
              t.staff_no, t.full_name AS teacher_name,
              tm.academic_year, tm.term_name,
              d.department_code, d.department_name
       FROM course_offerings co
       JOIN courses c ON c.course_id = co.course_id
       JOIN teachers t ON t.teacher_id = co.teacher_id
       JOIN terms tm ON tm.term_id = co.term_id
       JOIN departments d ON d.department_id = c.department_id
       WHERE co.offering_id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Offering not found' });

    const slots = await pool.query(
      `SELECT ss.*, r.room_number, r.building
       FROM schedule_slots ss
       LEFT JOIN rooms r ON r.room_id = ss.room_id
       WHERE ss.offering_id = $1
       ORDER BY ss.day_of_week, ss.start_time`,
      [req.params.id]
    );

    res.json({ offering: rows[0], slots: slots.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch offering' });
  }
});

// ── Admin: create offering ──
router.post('/', requireDeptAdmin, async (req, res) => {
  try {
    const { course_id, teacher_id, term_id, section } = req.body;
    if (!course_id || !teacher_id) {
      return res.status(400).json({ error: 'course_id and teacher_id required' });
    }

    // Auto-assign active term if not provided
    let resolvedTermId = term_id;
    if (!resolvedTermId) {
      const termRes = await pool.query('SELECT term_id FROM terms WHERE is_active = TRUE LIMIT 1');
      if (termRes.rows[0]) {
        resolvedTermId = termRes.rows[0].term_id;
      } else {
        // Auto-create a default term
        const newTerm = await pool.query(
          `INSERT INTO terms (academic_year, term_name, is_active) VALUES ('2025-2026', 'Default', TRUE) RETURNING term_id`
        );
        resolvedTermId = newTerm.rows[0].term_id;
      }
    }

    // Scope check for dept admin
    if (req.user.role === 'dept_admin') {
      const courseCheck = await pool.query('SELECT department_id FROM courses WHERE course_id = $1', [course_id]);
      if (!courseCheck.rows[0] || courseCheck.rows[0].department_id !== req.user.department_id) {
        return res.status(403).json({ error: 'Course not in your department' });
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO course_offerings (course_id, teacher_id, term_id, section)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [course_id, teacher_id, resolvedTermId, section || 'A']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'This course+term+section combination already exists' });
    console.error(err);
    res.status(500).json({ error: 'Failed to create offering' });
  }
});

// ── Admin: update offering ──
router.put('/:id', requireDeptAdmin, async (req, res) => {
  try {
    const { teacher_id, term_id, section } = req.body;
    const { rows } = await pool.query(
      `UPDATE course_offerings SET teacher_id = COALESCE($1, teacher_id),
                                    term_id = COALESCE($2, term_id),
                                    section = COALESCE($3, section)
       WHERE offering_id = $4 RETURNING *`,
      [teacher_id, term_id, section, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Offering not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update offering' });
  }
});

// ── Admin: delete offering ──
router.delete('/:id', requireDeptAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM course_offerings WHERE offering_id = $1', [req.params.id]);
    res.json({ message: 'Offering deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete offering' });
  }
});

export default router;
