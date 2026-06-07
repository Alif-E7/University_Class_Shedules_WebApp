---
name: university-schedule-portal
description: Builds and maintains the PERN university schedule portal — Excel import to PostgreSQL, homepage carousels by department and batch, admin upload, and demo Excel generation. Use when working on university-schedule-portal, faculty schedules, batch semesters (1-1, 2-1), Excel import, or homepage floating class cards.
---

# University Schedule Portal

## Project layout

```text
university-schedule-portal/
├── client/     React frontend
├── server/     Express API
└── db/         schema.sql, init.js, docker-compose
```

Excel is an **import source**. Required sheets:

| Sheet | Key columns |
|-------|-------------|
| Teachers | ID, Name, Email, Phone, Department, Designation, OfficeRoom |
| Courses | CourseID, Title, Credit, **Batch** (e.g. 1-1, 2-1), Department |
| Schedule | TeacherID, CourseID, Day, Start, End, Room |

`Batch` maps to `courses.semester` in PostgreSQL.

## Generate demo Excel

```bash
cd server && npm run seed:excel
```

Output: `server/sample-data/demo_university_schedule.xlsx`

## Database

```bash
npm run db:init          # from project root
```

Credentials in `server/.env`: `DB_HOST`, `DB_NAME=university_schedule`, `DB_USER`, `DB_PASSWORD`.

## Homepage design rules

1. **Today's date** shown at top.
2. **Per department** (CSE, EEE, BBA): max **5 active batches** as chips; floating carousel rotates every **5 seconds** through today's classes (movie-suggestion style).
3. **Running semesters section** below: one row per batch (1-1, 1-2, 2-1, 2-2 …), each with its own 5-second carousel.
4. Component: `client/src/components/FloatingCarousel.jsx`
5. Data: `GET /api/home/homepage`

## Run dev

```bash
npm run dev              # server :5000 + client :5173
```

Admin: `/admin` — upload demo Excel, default `admin@university.edu` / `admin123`.

## When changing schema

1. Edit `db/schema.sql`
2. Run `npm run db:init`
3. Re-import Excel from admin

## Additional resources

- Full setup: [README.md](../../README.md)
- DB folder: [db/README.md](../../db/README.md)
