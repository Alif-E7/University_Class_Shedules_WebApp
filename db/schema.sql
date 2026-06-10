-- =============================================
-- University Schedule Portal — Normalized Schema
-- =============================================
-- Design: Department-scoped, ID-keyed, two-layer
--   Reference Layer: departments, users, teachers, courses, rooms, terms
--   Activity Layer:  course_offerings, schedule_slots
--   Staging Layer:   import_batches, import_staging_rows
-- =============================================
-- Drop old tables if they exist to start fresh
DROP TABLE IF EXISTS import_staging_rows CASCADE;
DROP TABLE IF EXISTS import_batches CASCADE;
DROP TABLE IF EXISTS schedule_slots CASCADE;
DROP TABLE IF EXISTS course_offerings CASCADE;
DROP TABLE IF EXISTS terms CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS teachers CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;

-- ── Reference Layer ──────────────────────────

CREATE TABLE IF NOT EXISTS departments (
  department_id   SERIAL PRIMARY KEY,
  department_code VARCHAR(20) NOT NULL UNIQUE,
  department_name VARCHAR(150) NOT NULL,
  office_email    VARCHAR(255),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  user_id        SERIAL PRIMARY KEY,
  username       VARCHAR(100) NOT NULL UNIQUE,
  email          VARCHAR(255) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  role           VARCHAR(20) NOT NULL DEFAULT 'dept_admin'
                   CHECK (role IN ('central_admin', 'dept_admin')),
  department_id  INTEGER REFERENCES departments(department_id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teachers (
  teacher_id   SERIAL PRIMARY KEY,
  department_id INTEGER NOT NULL REFERENCES departments(department_id) ON DELETE CASCADE,
  staff_no     VARCHAR(50) NOT NULL,
  full_name    VARCHAR(255) NOT NULL,
  designation  VARCHAR(100),
  email        VARCHAR(255),
  phone        VARCHAR(50),
  office_room  VARCHAR(50),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(department_id, staff_no)
);

CREATE TABLE IF NOT EXISTS courses (
  course_id     SERIAL PRIMARY KEY,
  department_id INTEGER NOT NULL REFERENCES departments(department_id) ON DELETE CASCADE,
  course_code   VARCHAR(30) NOT NULL,
  course_title  VARCHAR(255) NOT NULL,
  credit        INTEGER NOT NULL DEFAULT 3,
  year          INTEGER CHECK (year BETWEEN 1 AND 4),
  semester      INTEGER CHECK (semester BETWEEN 1 AND 2),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(department_id, course_code)
);

CREATE TABLE IF NOT EXISTS rooms (
  room_id       SERIAL PRIMARY KEY,
  building      VARCHAR(100) NOT NULL DEFAULT 'Main',
  room_number   VARCHAR(50) NOT NULL,
  capacity      INTEGER,
  department_id INTEGER REFERENCES departments(department_id) ON DELETE SET NULL,
  UNIQUE(building, room_number)
);

CREATE TABLE IF NOT EXISTS terms (
  term_id       SERIAL PRIMARY KEY,
  academic_year VARCHAR(20) NOT NULL,
  term_name     VARCHAR(50) NOT NULL,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(academic_year, term_name)
);

-- ── Activity Layer ───────────────────────────

CREATE TABLE IF NOT EXISTS course_offerings (
  offering_id SERIAL PRIMARY KEY,
  course_id   INTEGER NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
  teacher_id  INTEGER NOT NULL REFERENCES teachers(teacher_id) ON DELETE CASCADE,
  term_id     INTEGER NOT NULL REFERENCES terms(term_id) ON DELETE CASCADE,
  section     VARCHAR(20) NOT NULL DEFAULT 'A',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, term_id, section)
);

CREATE TABLE IF NOT EXISTS schedule_slots (
  slot_id     SERIAL PRIMARY KEY,
  offering_id INTEGER NOT NULL REFERENCES course_offerings(offering_id) ON DELETE CASCADE,
  day_of_week VARCHAR(20) NOT NULL
                CHECK (day_of_week IN ('Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday','Friday')),
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  room_id     INTEGER REFERENCES rooms(room_id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Staging Layer (Excel import pipeline) ────

CREATE TABLE IF NOT EXISTS import_batches (
  batch_id      SERIAL PRIMARY KEY,
  uploaded_by   INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  department_id INTEGER REFERENCES departments(department_id) ON DELETE SET NULL,
  filename      VARCHAR(255),
  status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','previewed','approved','committed','rejected')),
  summary       JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS import_staging_rows (
  row_id     SERIAL PRIMARY KEY,
  batch_id   INTEGER NOT NULL REFERENCES import_batches(batch_id) ON DELETE CASCADE,
  sheet_name VARCHAR(50) NOT NULL,
  row_index  INTEGER NOT NULL,
  row_data   JSONB NOT NULL,
  errors     JSONB DEFAULT '[]',
  status     VARCHAR(20) NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','valid','error','committed'))
);

-- ── Indexes ──────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_teachers_department ON teachers(department_id);
CREATE INDEX IF NOT EXISTS idx_teachers_staff_no ON teachers(staff_no);
CREATE INDEX IF NOT EXISTS idx_courses_department ON courses(department_id);
CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(course_code);
CREATE INDEX IF NOT EXISTS idx_offerings_course ON course_offerings(course_id);
CREATE INDEX IF NOT EXISTS idx_offerings_teacher ON course_offerings(teacher_id);
CREATE INDEX IF NOT EXISTS idx_offerings_term ON course_offerings(term_id);
CREATE INDEX IF NOT EXISTS idx_slots_offering ON schedule_slots(offering_id);
CREATE INDEX IF NOT EXISTS idx_slots_day ON schedule_slots(day_of_week);
CREATE INDEX IF NOT EXISTS idx_slots_room ON schedule_slots(room_id);
CREATE INDEX IF NOT EXISTS idx_import_batches_dept ON import_batches(department_id);
CREATE INDEX IF NOT EXISTS idx_staging_batch ON import_staging_rows(batch_id);
