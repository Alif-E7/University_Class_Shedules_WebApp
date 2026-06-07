import { Router } from 'express';
import pool from '../db/pool.js';
import { requireDeptAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, d.department_code, d.department_name
       FROM rooms r
       LEFT JOIN departments d ON r.department_id = d.department_id
       ORDER BY r.building, r.room_number`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const room = await pool.query(
      `SELECT r.*, d.department_code, d.department_name
       FROM rooms r
       LEFT JOIN departments d ON r.department_id = d.department_id
       WHERE r.room_id = $1`,
      [req.params.id]
    );
    if (!room.rows[0]) return res.status(404).json({ error: 'Room not found' });

    const schedule = await pool.query(
      `SELECT ss.*, co.section,
              c.course_code, c.course_title,
              t.full_name AS teacher_name, t.staff_no
       FROM schedule_slots ss
       JOIN course_offerings co ON co.offering_id = ss.offering_id
       JOIN courses c ON c.course_id = co.course_id
       JOIN teachers t ON t.teacher_id = co.teacher_id
       WHERE ss.room_id = $1
       ORDER BY ss.day_of_week, ss.start_time`,
      [req.params.id]
    );

    res.json({ room: room.rows[0], schedule: schedule.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

router.post('/', requireDeptAdmin, async (req, res) => {
  try {
    const { building, room_number, capacity, department_id } = req.body;
    if (!room_number) return res.status(400).json({ error: 'room_number required' });

    const deptId = req.user.role === 'dept_admin' ? req.user.department_id : (department_id || null);

    const { rows } = await pool.query(
      `INSERT INTO rooms (building, room_number, capacity, department_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [building || 'Main', room_number, capacity || null, deptId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Room already exists in this building' });
    console.error(err);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

router.put('/:id', requireDeptAdmin, async (req, res) => {
  try {
    const { building, room_number, capacity } = req.body;
    const { rows } = await pool.query(
      `UPDATE rooms SET building = COALESCE($1, building), room_number = COALESCE($2, room_number),
                         capacity = COALESCE($3, capacity)
       WHERE room_id = $4 RETURNING *`,
      [building, room_number, capacity, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Room not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update room' });
  }
});

router.delete('/:id', requireDeptAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM rooms WHERE room_id = $1', [req.params.id]);
    res.json({ message: 'Room deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

export default router;
