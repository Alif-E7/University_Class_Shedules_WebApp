import { Router } from 'express';
import pool from '../db/pool.js';
import { requireCentralAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM terms ORDER BY academic_year DESC, term_name');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch terms' });
  }
});

router.post('/', requireCentralAdmin, async (req, res) => {
  try {
    const { academic_year, term_name, is_active } = req.body;
    if (!academic_year || !term_name) {
      return res.status(400).json({ error: 'academic_year and term_name required' });
    }
    const { rows } = await pool.query(
      `INSERT INTO terms (academic_year, term_name, is_active)
       VALUES ($1, $2, $3) RETURNING *`,
      [academic_year, term_name, is_active !== false]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Term already exists' });
    console.error(err);
    res.status(500).json({ error: 'Failed to create term' });
  }
});

router.put('/:id', requireCentralAdmin, async (req, res) => {
  try {
    const { academic_year, term_name, is_active } = req.body;
    const { rows } = await pool.query(
      `UPDATE terms SET academic_year = COALESCE($1, academic_year),
                         term_name = COALESCE($2, term_name),
                         is_active = COALESCE($3, is_active)
       WHERE term_id = $4 RETURNING *`,
      [academic_year, term_name, is_active, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Term not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update term' });
  }
});

router.delete('/:id', requireCentralAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM terms WHERE term_id = $1', [req.params.id]);
    res.json({ message: 'Term deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete term' });
  }
});

export default router;
