import { Router } from 'express';
import pool from '../db/pool.js';
import { requireDeptAdmin } from '../middleware/auth.js';

const router = Router();

const DAY_ORDER = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function normalizeDay(d) {
  if (!d) return d;
  const s = d.trim();
  return DAY_ORDER.find(day => day.toLowerCase() === s.toLowerCase()) || s;
}

// ── Public: list schedule slots ──
router.get('/', async (req, res) => {
  try {
    const { day, teacher_id, course_id, department_id, room_id, term_id, year, semester } = req.query;
    let sql = `
      SELECT ss.*, co.section, co.offering_id,
             c.course_code, c.course_title, c.credit, c.year, c.semester,
             t.teacher_id, t.full_name AS teacher_name, t.staff_no,
             r.room_number, r.building,
             d.department_code, d.department_name,
             tm.academic_year, tm.term_name
      FROM schedule_slots ss
      JOIN course_offerings co ON co.offering_id = ss.offering_id
      JOIN courses c ON c.course_id = co.course_id
      JOIN teachers t ON t.teacher_id = co.teacher_id
      JOIN terms tm ON tm.term_id = co.term_id
      JOIN departments d ON d.department_id = c.department_id
      LEFT JOIN rooms r ON r.room_id = ss.room_id
      WHERE 1=1`;
    const params = [];

    if (day) {
      params.push(normalizeDay(day));
      sql += ` AND ss.day_of_week = $${params.length}`;
    }
    if (teacher_id) {
      params.push(teacher_id);
      sql += ` AND co.teacher_id = $${params.length}`;
    }
    if (course_id) {
      params.push(course_id);
      sql += ` AND co.course_id = $${params.length}`;
    }
    if (department_id) {
      params.push(department_id);
      sql += ` AND c.department_id = $${params.length}`;
    }
    if (room_id) {
      params.push(room_id);
      sql += ` AND ss.room_id = $${params.length}`;
    }
    if (term_id) {
      params.push(term_id);
      sql += ` AND co.term_id = $${params.length}`;
    }
    if (year) {
      params.push(parseInt(year));
      sql += ` AND c.year = $${params.length}`;
    }
    if (semester) {
      params.push(parseInt(semester));
      sql += ` AND c.semester = $${params.length}`;
    }

    sql += ' ORDER BY ss.day_of_week, ss.start_time';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

// ── Public: weekly grid ──
router.get('/weekly', async (req, res) => {
  try {
    const { teacher_id, department_id, term_id, year, semester } = req.query;
    let sql = `
      SELECT ss.*, co.section,
             c.course_code, c.course_title, c.year, c.semester,
             t.full_name AS teacher_name, t.teacher_id,
             r.room_number, r.building,
             d.department_code
      FROM schedule_slots ss
      JOIN course_offerings co ON co.offering_id = ss.offering_id
      JOIN courses c ON c.course_id = co.course_id
      JOIN teachers t ON t.teacher_id = co.teacher_id
      JOIN departments d ON d.department_id = c.department_id
      LEFT JOIN rooms r ON r.room_id = ss.room_id
      JOIN terms tm ON tm.term_id = co.term_id
      WHERE 1=1`;
    const params = [];

    if (teacher_id) {
      params.push(teacher_id);
      sql += ` AND co.teacher_id = $${params.length}`;
    }
    if (department_id) {
      params.push(department_id);
      sql += ` AND c.department_id = $${params.length}`;
    }
    if (year) {
      params.push(parseInt(year));
      sql += ` AND c.year = $${params.length}`;
    }
    if (semester) {
      params.push(parseInt(semester));
      sql += ` AND c.semester = $${params.length}`;
    }
    if (term_id) {
      params.push(term_id);
      sql += ` AND co.term_id = $${params.length}`;
    } else {
      sql += ` AND tm.is_active = TRUE`;
    }

    sql += ' ORDER BY ss.day_of_week, ss.start_time';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch weekly schedule' });
  }
});

// ── Public: today's classes ──
router.get('/today', async (req, res) => {
  try {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];

    const { rows } = await pool.query(
      `SELECT ss.slot_id, ss.day_of_week, ss.start_time, ss.end_time,
              co.offering_id, co.section,
              c.course_id, c.course_code, c.course_title, c.credit, c.semester,
              t.teacher_id, t.full_name AS teacher_name, t.designation, t.staff_no,
              r.room_number, r.building,
              d.department_code, d.department_name
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
    res.json({ day: today, classes: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch today schedule' });
  }
});

// ── Public: room schedule ──
router.get('/room/:roomId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ss.*, co.section,
              c.course_code, c.course_title,
              t.full_name AS teacher_name,
              r.room_number, r.building
       FROM schedule_slots ss
       JOIN course_offerings co ON co.offering_id = ss.offering_id
       JOIN courses c ON c.course_id = co.course_id
       JOIN teachers t ON t.teacher_id = co.teacher_id
       LEFT JOIN rooms r ON r.room_id = ss.room_id
       WHERE ss.room_id = $1
       ORDER BY ss.day_of_week, ss.start_time`,
      [req.params.roomId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch room schedule' });
  }
});

// ── Admin: add schedule slot ──
router.post('/', requireDeptAdmin, async (req, res) => {
  try {
    const { offering_id, day_of_week, start_time, end_time, room_id } = req.body;
    if (!offering_id || !day_of_week || !start_time || !end_time) {
      return res.status(400).json({ error: 'offering_id, day_of_week, start_time, end_time required' });
    }

    const { rows } = await pool.query(
      `INSERT INTO schedule_slots (offering_id, day_of_week, start_time, end_time, room_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [offering_id, normalizeDay(day_of_week), start_time, end_time, room_id || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create schedule slot' });
  }
});

// ── Admin: update slot ──
router.put('/:id', requireDeptAdmin, async (req, res) => {
  try {
    const { day_of_week, start_time, end_time, room_id } = req.body;
    const { rows } = await pool.query(
      `UPDATE schedule_slots SET day_of_week = COALESCE($1, day_of_week),
                                  start_time = COALESCE($2, start_time),
                                  end_time = COALESCE($3, end_time),
                                  room_id = COALESCE($4, room_id)
       WHERE slot_id = $5 RETURNING *`,
      [day_of_week ? normalizeDay(day_of_week) : null, start_time, end_time, room_id, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Slot not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update slot' });
  }
});

// ── Admin: delete slot ──
router.delete('/:id', requireDeptAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM schedule_slots WHERE slot_id = $1', [req.params.id]);
    res.json({ message: 'Schedule slot deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete slot' });
  }
});

export default router;
