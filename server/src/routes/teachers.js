import { Router } from 'express';
import pool from '../db/pool.js';
import { requireDeptAdmin, getScopedDepartmentId } from '../middleware/auth.js';
import { computeTeachingLoad } from '../services/workload.js';
import { computeFreeSlots, getTeacherAvailabilityNow } from '../services/freeSlots.js';

const router = Router();

// ── Public: list teachers ──
router.get('/', async (req, res) => {
  try {
    const { q, department_id, designation } = req.query;
    let sql = `
      SELECT t.*, d.department_code, d.department_name
      FROM teachers t
      JOIN departments d ON t.department_id = d.department_id
      WHERE 1=1`;
    const params = [];

    if (q) {
      params.push(`%${q}%`);
      sql += ` AND (t.full_name ILIKE $${params.length} OR t.staff_no ILIKE $${params.length})`;
    }
    if (department_id) {
      params.push(department_id);
      sql += ` AND t.department_id = $${params.length}`;
    }
    if (designation) {
      params.push(`%${designation}%`);
      sql += ` AND t.designation ILIKE $${params.length}`;
    }

    sql += ' ORDER BY t.full_name';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
});

// ── Public: teacher profile ──
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.*, d.department_code, d.department_name
       FROM teachers t
       JOIN departments d ON t.department_id = d.department_id
       WHERE t.teacher_id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Teacher not found' });

    // Get offerings + schedule slots for this teacher
    const schedules = await pool.query(
      `SELECT ss.slot_id, ss.day_of_week, ss.start_time, ss.end_time,
              co.offering_id, co.section,
              c.course_id, c.course_code, c.course_title, c.credit,
              r.room_number, r.building,
              t2.term_name, t2.academic_year
       FROM schedule_slots ss
       JOIN course_offerings co ON co.offering_id = ss.offering_id
       JOIN courses c ON c.course_id = co.course_id
       JOIN terms t2 ON t2.term_id = co.term_id
       LEFT JOIN rooms r ON r.room_id = ss.room_id
       WHERE co.teacher_id = $1
       ORDER BY ss.day_of_week, ss.start_time`,
      [req.params.id]
    );

    const coursesRes = await pool.query(
      `SELECT DISTINCT c.course_id, c.course_code, c.course_title, c.credit, c.semester
       FROM courses c
       JOIN course_offerings co ON co.course_id = c.course_id
       WHERE co.teacher_id = $1`,
      [req.params.id]
    );

    const slotsForWorkload = schedules.rows.map(s => ({
      ...s,
      course_id: s.course_id,
      day: s.day_of_week,
      start_time: s.start_time,
      end_time: s.end_time,
      room: s.room_number,
    }));

    const coursesById = Object.fromEntries(coursesRes.rows.map(c => [c.course_id, c]));
    const workload = computeTeachingLoad(slotsForWorkload, coursesById);
    const freeSlots = computeFreeSlots(slotsForWorkload);
    const availability = getTeacherAvailabilityNow(slotsForWorkload);

    // Detect conflicts for this teacher
    const conflicts = detectTeacherConflicts(slotsForWorkload);

    res.json({
      teacher: rows[0],
      schedules: schedules.rows,
      courses: coursesRes.rows,
      workload,
      freeSlots,
      availability,
      conflicts,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch teacher' });
  }
});

function detectTeacherConflicts(slots) {
  const conflicts = [];
  const byDay = {};
  for (const s of slots) {
    const day = s.day_of_week || s.day;
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(s);
  }
  for (const [day, items] of Object.entries(byDay)) {
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i], b = items[j];
        if (timeOverlaps(a.start_time, a.end_time, b.start_time, b.end_time)) {
          conflicts.push({
            day,
            class1: { course_code: a.course_code, start_time: a.start_time, end_time: a.end_time, room: a.room_number },
            class2: { course_code: b.course_code, start_time: b.start_time, end_time: b.end_time, room: b.room_number },
          });
        }
      }
    }
  }
  return conflicts;
}

function timeOverlaps(s1, e1, s2, e2) {
  const toMin = (t) => {
    const str = String(t).slice(0, 5);
    const [h, m] = str.split(':').map(Number);
    return h * 60 + m;
  };
  return toMin(s1) < toMin(e2) && toMin(s2) < toMin(e1);
}

// ── Admin: create teacher ──
router.post('/', requireDeptAdmin, async (req, res) => {
  try {
    const deptId = req.user.role === 'dept_admin'
      ? req.user.department_id
      : req.body.department_id;

    if (!deptId) return res.status(400).json({ error: 'department_id required' });

    const { staff_no, full_name, designation, email, phone, office_room } = req.body;
    if (!staff_no || !full_name) {
      return res.status(400).json({ error: 'staff_no and full_name required' });
    }

    const { rows } = await pool.query(
      `INSERT INTO teachers (department_id, staff_no, full_name, designation, email, phone, office_room)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [deptId, staff_no, full_name, designation || null, email || null, phone || null, office_room || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Staff number already exists in this department' });
    console.error(err);
    res.status(500).json({ error: 'Failed to create teacher' });
  }
});

// ── Admin: update teacher ──
router.put('/:id', requireDeptAdmin, async (req, res) => {
  try {
    // Scope check
    if (req.user.role === 'dept_admin') {
      const check = await pool.query('SELECT department_id FROM teachers WHERE teacher_id = $1', [req.params.id]);
      if (!check.rows[0] || check.rows[0].department_id !== req.user.department_id) {
        return res.status(403).json({ error: 'Cannot modify teachers outside your department' });
      }
    }

    const { staff_no, full_name, designation, email, phone, office_room } = req.body;
    const { rows } = await pool.query(
      `UPDATE teachers SET staff_no = COALESCE($1, staff_no), full_name = COALESCE($2, full_name),
                            designation = COALESCE($3, designation), email = COALESCE($4, email),
                            phone = COALESCE($5, phone), office_room = COALESCE($6, office_room),
                            updated_at = NOW()
       WHERE teacher_id = $7 RETURNING *`,
      [staff_no, full_name, designation, email, phone, office_room, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Teacher not found' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Staff number already exists in this department' });
    console.error(err);
    res.status(500).json({ error: 'Failed to update teacher' });
  }
});

// ── Admin: delete teacher ──
router.delete('/:id', requireDeptAdmin, async (req, res) => {
  try {
    if (req.user.role === 'dept_admin') {
      const check = await pool.query('SELECT department_id FROM teachers WHERE teacher_id = $1', [req.params.id]);
      if (!check.rows[0] || check.rows[0].department_id !== req.user.department_id) {
        return res.status(403).json({ error: 'Cannot delete teachers outside your department' });
      }
    }
    await pool.query('DELETE FROM teachers WHERE teacher_id = $1', [req.params.id]);
    res.json({ message: 'Teacher deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete teacher' });
  }
});

export default router;
