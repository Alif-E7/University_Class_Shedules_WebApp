import { Router } from 'express';
import multer from 'multer';
import { requireDeptAdmin } from '../middleware/auth.js';
import { parseWorkbook, commitImportToDb } from '../services/excelImport.js';
import pool from '../db/pool.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();

// ── Stage 1-4: Upload + Parse + Validate + Store staging ──
router.post('/preview', requireDeptAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const deptCode = req.user.role === 'dept_admin' ? req.user.department_code : null;
    const importType = req.query.type || 'all';
    const data = parseWorkbook(req.file.buffer, deptCode, importType);

    // Create import batch record
    const batch = await pool.query(
      `INSERT INTO import_batches (uploaded_by, department_id, filename, status, summary)
       VALUES ($1, $2, $3, 'previewed', $4) RETURNING batch_id`,
      [req.user.user_id, req.user.department_id || null, req.file.originalname, JSON.stringify(data.summary)]
    );

    // Store staging rows
    const batchId = batch.rows[0].batch_id;
    const stagingInserts = [];

    // Store department info in staging rows if it exists
    if (data.department && data.department.department_code) {
      stagingInserts.push(
        pool.query(
          `INSERT INTO import_staging_rows (batch_id, sheet_name, row_index, row_data, status)
           VALUES ($1, 'department', 0, $2, $3)`,
          [batchId, JSON.stringify(data.department), data.errors.length > 0 ? 'error' : 'valid']
        )
      );
    }

    for (const [sheet, rows] of [['departments', data.departments], ['teachers', data.teachers], ['courses', data.courses], ['offerings', data.offerings], ['schedules', data.schedules]]) {
      for (let i = 0; i < rows.length; i++) {
        stagingInserts.push(
          pool.query(
            `INSERT INTO import_staging_rows (batch_id, sheet_name, row_index, row_data, status)
             VALUES ($1, $2, $3, $4, $5)`,
            [batchId, sheet, i, JSON.stringify(rows[i]), data.errors.length > 0 ? 'error' : 'valid']
          )
        );
      }
    }
    await Promise.all(stagingInserts);

    res.json({ ...data, batch_id: batchId });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// ── Stage 5-7: Confirm → Match → Commit ──
router.post('/confirm/:batchId', requireDeptAdmin, async (req, res) => {
  try {
    const { batchId } = req.params;
    const { term_id } = req.body;

    // Verify batch ownership
    const batch = await pool.query('SELECT * FROM import_batches WHERE batch_id = $1', [batchId]);
    if (!batch.rows[0]) return res.status(404).json({ error: 'Import batch not found' });
    if (batch.rows[0].status === 'committed') return res.status(400).json({ error: 'Already committed' });

    // Reconstruct data from staging rows
    const staging = await pool.query(
      'SELECT * FROM import_staging_rows WHERE batch_id = $1 ORDER BY sheet_name, row_index',
      [batchId]
    );

    const data = { department: {}, departments: [], teachers: [], courses: [], offerings: [], schedules: [] };
    for (const row of staging.rows) {
      if (row.sheet_name === 'department') {
        data.department = row.row_data;
      } else if (row.sheet_name === 'departments') {
        data.departments.push(row.row_data);
      } else if (data[row.sheet_name]) {
        data[row.sheet_name].push(row.row_data);
      }
    }

    // If dept admin, use their department
    const deptId = req.user.role === 'dept_admin' ? req.user.department_id : batch.rows[0].department_id;

    const result = await commitImportToDb(pool, data, deptId, term_id || null);

    // Update batch status
    await pool.query(
      `UPDATE import_batches SET status = 'committed' WHERE batch_id = $1`,
      [batchId]
    );
    await pool.query(
      `UPDATE import_staging_rows SET status = 'committed' WHERE batch_id = $1`,
      [batchId]
    );

    res.json({ message: 'Import committed successfully', ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `Import failed: ${err.message}` });
  }
});

// ── Quick upload (skip staging) ──
router.post('/upload', requireDeptAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const deptCode = req.user.role === 'dept_admin' ? req.user.department_code : null;
    const importType = req.query.type || 'all';
    const data = parseWorkbook(req.file.buffer, deptCode, importType);

    if (data.errors.length) {
      return res.status(400).json({ error: 'Validation failed', details: data.errors, preview: data });
    }

    const deptId = req.user.role === 'dept_admin' ? req.user.department_id : null;
    const result = await commitImportToDb(pool, data, deptId, req.body?.term_id || null);

    // Record the import
    await pool.query(
      `INSERT INTO import_batches (uploaded_by, department_id, filename, status, summary)
       VALUES ($1, $2, $3, 'committed', $4)`,
      [req.user.user_id, deptId, req.file.originalname, JSON.stringify(data.summary)]
    );

    res.json({ message: 'Import completed', summary: data.summary, conflicts: data.conflicts, ...result });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// ── Reject import ──
router.post('/reject/:batchId', requireDeptAdmin, async (req, res) => {
  try {
    await pool.query(`UPDATE import_batches SET status = 'rejected' WHERE batch_id = $1`, [req.params.batchId]);
    await pool.query(`DELETE FROM import_staging_rows WHERE batch_id = $1`, [req.params.batchId]);
    res.json({ message: 'Import rejected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reject import' });
  }
});

// ── Import history ──
router.get('/history', requireDeptAdmin, async (req, res) => {
  try {
    const deptFilter = req.user.role === 'dept_admin' ? 'WHERE ib.department_id = $1' : '';
    const params = req.user.role === 'dept_admin' ? [req.user.department_id] : [];

    const { rows } = await pool.query(
      `SELECT ib.*, u.username, u.email AS uploaded_by_email,
              d.department_code
       FROM import_batches ib
       JOIN users u ON u.user_id = ib.uploaded_by
       LEFT JOIN departments d ON d.department_id = ib.department_id
       ${deptFilter}
       ORDER BY ib.created_at DESC
       LIMIT 50`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch import history' });
  }
});

export default router;
