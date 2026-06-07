import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../.env') });

export function getPoolConfig() {
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

export async function testConnection() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    const dbName = process.env.DB_NAME || 'university_schedule';
    console.log(`Connected to ${dbName} database`);
  } finally {
    client.release();
  }
}

export default pool;
