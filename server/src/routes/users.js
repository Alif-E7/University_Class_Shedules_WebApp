import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db/pool.js';
import { requireCentralAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', requireCentralAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.user_id, u.username, u.email, u.role, u.department_id, u.created_at,
              d.department_code, d.department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.department_id
       ORDER BY u.role, u.username`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/', requireCentralAdmin, async (req, res) => {
  try {
    const { username, email, password, role, department_id } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email, password required' });
    }
    if (role === 'dept_admin' && !department_id) {
      return res.status(400).json({ error: 'department_id required for dept_admin' });
    }

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (username, email, password_hash, role, department_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING user_id, username, email, role, department_id, created_at`,
      [username, email, hash, role || 'dept_admin', department_id || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Username or email already exists' });
    console.error(err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.put('/:id', requireCentralAdmin, async (req, res) => {
  try {
    const { username, email, password, role, department_id } = req.body;
    const updates = [];
    const params = [];
    let idx = 0;

    if (username) { idx++; updates.push(`username = $${idx}`); params.push(username); }
    if (email) { idx++; updates.push(`email = $${idx}`); params.push(email); }
    if (password) { idx++; updates.push(`password_hash = $${idx}`); params.push(await bcrypt.hash(password, 10)); }
    if (role) { idx++; updates.push(`role = $${idx}`); params.push(role); }
    if (department_id !== undefined) { idx++; updates.push(`department_id = $${idx}`); params.push(department_id || null); }

    if (!updates.length) return res.status(400).json({ error: 'No fields to update' });

    idx++;
    params.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE user_id = $${idx}
       RETURNING user_id, username, email, role, department_id, created_at`,
      params
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Username or email already exists' });
    console.error(err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/:id', requireCentralAdmin, async (req, res) => {
  try {
    // Prevent self-deletion
    if (parseInt(req.params.id) === req.user.user_id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    await pool.query('DELETE FROM users WHERE user_id = $1', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
