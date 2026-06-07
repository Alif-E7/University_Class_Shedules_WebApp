import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import importRoutes from './routes/import.js';
import teacherRoutes from './routes/teachers.js';
import courseRoutes from './routes/courses.js';
import scheduleRoutes from './routes/schedules.js';
import departmentRoutes from './routes/departments.js';
import offeringRoutes from './routes/offerings.js';
import roomRoutes from './routes/rooms.js';
import termRoutes from './routes/terms.js';
import userRoutes from './routes/users.js';
import analyticsRoutes from './routes/analytics.js';
import exportRoutes from './routes/export.js';
import homeRoutes from './routes/home.js';
import { testConnection } from './config/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/import', importRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/offerings', offeringRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/terms', termRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/home', homeRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  try {
    await testConnection();
  } catch (err) {
    console.error('Database connection error:', err.message);
    console.error('Check server/.env — DB_HOST, DB_NAME, DB_USER, DB_PASSWORD');
  }
});
