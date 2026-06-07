import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const { rows } = await pool.query(
      `SELECT u.*, d.department_code, d.department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.department_id
       WHERE u.email = $1`,
      [email]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        user_id: user.user_id,
        email: user.email,
        role: user.role,
        department_id: user.department_id,
        department_code: user.department_code || null,
      },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role,
        department_id: user.department_id,
        department_code: user.department_code || null,
        department_name: user.department_name || null,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.user_id, u.username, u.email, u.role, u.department_id,
              d.department_code, d.department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.department_id
       WHERE u.user_id = $1`,
      [req.user.user_id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
