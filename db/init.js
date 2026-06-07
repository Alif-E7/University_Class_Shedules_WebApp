import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '../server/.env') });

function getPoolConfig() {
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL };
  }
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'university_schedule',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  };
}

const pool = new pg.Pool(getPoolConfig());

async function init() {
  if (!process.env.DB_PASSWORD && !process.env.DATABASE_URL) {
    throw new Error('Set DB_PASSWORD in db/.env or server/.env');
  }

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);

  // ── Seed central admin ──
  const email = process.env.ADMIN_EMAIL || 'admin@university.edu';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const hash = await bcrypt.hash(password, 10);

  await pool.query(
    `INSERT INTO users (username, email, password_hash, role)
     VALUES ($1, $2, $3, 'central_admin')
     ON CONFLICT (email) DO NOTHING`,
    ['admin', email, hash]
  );

  // ── Seed default term ──
  await pool.query(
    `INSERT INTO terms (academic_year, term_name, is_active)
     VALUES ('2025-2026', 'Spring', TRUE)
     ON CONFLICT (academic_year, term_name) DO NOTHING`
  );

  console.log('Database initialized with new normalized schema.');
  console.log(`Central admin login: ${email} / ${password}`);
  console.log('Default term: 2025-2026 Spring');
  await pool.end();
}

init().catch((err) => {
  console.error(err);
  process.exit(1);
});
