# University Faculty & Schedule Management System

A web-based university information portal that allows department offices to manage faculty, courses, and class schedules through Excel imports, while providing students and visitors with a searchable public interface for exploring academic information.

---

## Overview

This system transforms departmental Excel data into a centralized, structured university information platform.

Department administrators can upload and manage data related to:

* Departments
* Faculty Members
* Courses
* Course Offerings
* Class Schedules

Students and visitors can browse and search information without requiring an account.

---

## Key Features

### Department Management

* Manage university departments
* Department-specific data ownership
* Multi-department support

### Faculty Management

* Faculty profiles
* Designation and office information
* Department affiliation
* Teaching assignments

### Course Management

* Course catalog
* Credits and semester information
* Department-wise course organization

### Schedule Management

* Weekly class schedules
* Teacher timetable
* Course timetable
* Classroom allocation

### Excel Import System

* Import structured academic data from Excel files
* Data validation before commit
* Preview imported records
* Approval workflow

### Search & Discovery

* Search teachers
* Search courses
* Browse departments
* Explore schedules

### Public Information Portal

* No login required
* Faculty directory
* Department pages
* Course information pages
* Schedule viewer

---

## System Workflow

```text
Department Office
        │
        ▼
 Upload Excel Files
        │
        ▼
 Validate Data
        │
        ▼
 Preview Import
        │
        ▼
 Approve & Commit
        │
        ▼
    Database
        │
        ▼
 Public Web Portal
```

---

## Data Structure

The system follows a normalized relational database design to minimize redundancy and ensure data consistency.

### Core Entities

```text
Departments
    │
    ├── Teachers
    │
    └── Courses
            │
            ▼
       Offerings
            │
            ▼
       Schedules
```

### Relationships

* One Department → Many Teachers
* One Department → Many Courses
* One Course → Many Offerings
* One Teacher → Many Offerings
* One Offering → Many Schedule Entries

---

## Excel Import Files

### Departments.xlsx

Stores department information.

```text
department_code
department_name
```

### Teachers.xlsx

Stores faculty information.

```text
staff_no
department_code
full_name
designation
email
office_room
```

### Courses.xlsx

Stores course information.

```text
course_code
department_code
course_title
credit
semester
```

### Offerings.xlsx

Links teachers and courses.

```text
offering_id
course_code
staff_no
term_code
section
```

### Schedules.xlsx

Stores class schedules.

```text
slot_id
offering_id
day_of_week
start_time
end_time
room
```

---

## Tech Stack

### Frontend

* React.js
* Tailwind CSS
* TypeScript

### Backend

* Node.js
* Express.js

### Database

* PostgreSQL

### Excel Processing

* XLSX

---

## Design Principles

* Department-scoped data management
* Relational database normalization
* Minimal data redundancy
* Scalable architecture
* Excel-based administrative workflow
* Public access to academic information
* Clean separation between administrative and public functionality

---

## Future Enhancements

* Conflict detection for overlapping schedules
* Faculty workload analytics
* Room occupancy tracking
* Timetable export (PDF/Excel)
* Advanced filtering and search
* Academic calendar integration
* Attendance management
* Notification system

---

## Project Goal

To provide a centralized, scalable, and user-friendly platform for managing and publishing university faculty, course, and scheduling information while reducing manual administrative effort and improving information accessibility for students and staff.
