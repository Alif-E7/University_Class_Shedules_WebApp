# Database (`db/`)

PostgreSQL schema, initialization scripts, and Docker setup.

## Contents

| File | Purpose |
|------|---------|
| `schema.sql` | Table definitions (departments, teachers, courses, schedules, admins) |
| `init.js` | Applies schema and seeds default admin account |
| `docker-compose.yml` | Runs PostgreSQL 16 locally |
| `.env.example` | Connection string and admin seed credentials |

## Setup

```bash
cd db
cp .env.example .env
npm install
npm run up      # start PostgreSQL (requires Docker)
npm run init    # create tables + admin user
```

Default admin after init: `admin@university.edu` / `admin123`

## Connection

The server reads DB credentials from `server/.env`. Keep `db/.env` and `server/.env` in sync.
