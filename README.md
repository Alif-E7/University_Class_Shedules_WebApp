# University Faculty & Class Schedule Management System

**PERN stack** — PostgreSQL, Express, React, Node.js — with Excel as an **import source**, not the database.

## Project Structure

```text
university-schedule-portal/
├── client/       # React (Vite) — public portal + admin UI
├── server/       # Express REST API — Excel import, business logic
├── db/           # PostgreSQL schema, init scripts, Docker
└── README.md
```

| Folder | Role |
|--------|------|
| **client/** | React app — homepage carousels, teacher directory, admin dashboard |
| **server/** | Node/Express API — parses Excel, serves data, exports PDF/Excel |
| **db/** | Database layer — `schema.sql`, `init.js`, `docker-compose.yml` |

## Architecture

```text
Admin → Upload Excel (.xlsx)
         ↓
    server/ (Excel Parser)
         ↓
    db/ → PostgreSQL (normalized)
         ↓
    server/ (Express REST API)
         ↓
    client/ (React Portal)
```

## Quick Start

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Database

```bash
cd db
cp .env.example .env
npm run up          # PostgreSQL via Docker (optional)
npm run init        # create tables + admin user
```

Also copy `server/.env.example` → `server/.env` and set the same DB credentials.

### 3. Backend

```bash
cd server
cp .env.example .env
npm run seed:excel  # creates demo Excel file
npm run dev         # http://localhost:5000
```

### 4. Frontend

```bash
cd client
npm run dev         # http://localhost:5173
```

Or from project root: `npm run dev`

### 5. Admin

- URL: http://localhost:5173/admin
- Default: `admin@university.edu` / `admin123`
- Upload: `server/sample-data/demo_university_schedule.xlsx`

## Features

- Excel import (Teachers, Courses, Schedule sheets with Batch column)
- Homepage: department carousels + semester rows (5-second rotation)
- Teaching load, conflict detection, free slots, PDF/Excel export

## Root Scripts

| Command | Description |
|---------|-------------|
| `npm run install:all` | Install deps in root, db, server, client |
| `npm run dev` | Start server + client |
| `npm run db:up` | Start PostgreSQL (Docker) |
| `npm run db:init` | Apply schema + seed admin |
| `npm run seed:excel` | Generate demo Excel in server |

## License

MIT — for academic use.
