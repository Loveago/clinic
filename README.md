# WellLife Medical Center & Nursing Training School Digital Platform

> **Powered by:** Crazy Tech Enterprise  
> **Built for:** WellLife Medical Center & WellLife Nursing Training School  
> **Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Prisma ORM, SQLite / PostgreSQL, JWT Authentication.

---

## 🌟 Executive Overview & Attached Mockup Alignment

The platform faithfully implements the exact visual design language and full-stack operational architecture specified in the master prompt and the attached visual mockup:

1. **Clinic Homepage (`/`)**:
   - **Deep Emerald Hero (`#073832`)** with split hero composition.
   - Tagline: `COMPASSIONATE CARE. BETTER HEALTH.`, headline: `Your Health, Our Priority`.
   - Action buttons: `Book Appointment ->` (pill button) and `Learn More`.
   - Smiling physician portrait with floating **Opening Hours card** (`Mon - Fri: 8AM - 8PM | Sat: 9AM - 5PM`).
   - Floating Services Bar:
     - *General Medicine & Specialist Care*
     - *Advanced Diagnostics*
     - *Pharmacy Services*
     - *Wellness & Preventive Care*
   - About section with waiting room imagery and contact cards (Location: `123 Health Avenue, Lagos, Nigeria`, Phone: `+234 801 234 5678`, Email: `info@welllife.com`).

2. **Nursing School Homepage (`/school`)**:
   - Header with graduation cap icon and navigation links.
   - Hero: `LEARN · PRACTICE · EXCEL`, `Build a Career in Nursing`, and mint green pill button `Explore Courses ->`.
   - **Our Programs** section strictly matching the mockup:
     - **Basic Nursing Certificate** (6 Months · ₦50,000)
     - **Advanced Nursing Diploma** (1 Year · ₦120,000)
     - **Specialized Care Training** (3 Months · ₦75,000)

3. **Student Dashboard (`/portal/student/dashboard`)**:
   - Deep forest green sidebar (`#073832`) with WellLife Nursing School brand.
   - Top Bar: `Student Dashboard / Welcome back, Chioma!`, notification bell, and avatar.
   - 3 Stat Cards:
     - *Enrolled Courses*: **3**
     - *Completed Topics*: **8 / 15**
     - *Latest Result*: **92%**
   - Main content grid:
     - *My Courses*: Basic Nursing Certificate with 60% progress bar and `Continue Learning ->`.
     - *Upcoming Exams*: Anatomy & Physiology (Tue, Apr 29, 2025 · 10:00 AM) with `View Details`.

4. **Exam Results View (`/portal/student/results`)**:
   - Circular green checkmark badge.
   - `Congratulations! You scored 92%`.
   - Performance breakdown:
     - Correct Answers: **23**
     - Incorrect Answers: **2**
     - Total Questions: **25**
   - Action: `View Detailed Results ->` with complete 25-question review and clinical rationales.

5. **Online Admissions Application System (`/school/apply` & `/school/track`)**:
   - Online form purchase and submission with fee payment.
   - Unique reference number generation (e.g., `APP-2025-0104`).
   - Real-time application tracking by reference number.

6. **Administration Portal (`/portal/admin`)**:
   - Clinic appointment management (confirm, reschedule, complete).
   - Admissions application review and 1-click **Enroll as Student** converter (automatically creates student number `WNS/2025/xxx` and portal login).
   - Financial ledger with payments, fees, and receipts.

---

## 🔑 Demo Accounts & One-Click Role Switcher

A quick role switcher is embedded on every page (top navigation bar and floating dropdown) allowing you to switch perspectives instantly:

| Role | Name | Email | Password | Direct Portal Route |
| :--- | :--- | :--- | :--- | :--- |
| **Student** | Chioma Eze | `chioma@student.welllife.org` | `password123` | `/portal/student/dashboard` |
| **Lecturer** | Dr. Kemi Adebayo | `dr.adebayo@welllife.org` | `password123` | `/portal/lecturer` |
| **Super Admin** | Dr. Michael Adeyemi | `admin@welllife.org` | `admin123` | `/portal/admin` |

---

## 🛠️ Developer Setup & Commands

```bash
# Install dependencies
npm install

# Push schema and sync SQLite database
npx prisma db push

# Seed realistic database records
node prisma/seed.js

# Build production bundle
npm run build

# Start production server on port 3000
npm run start -- -p 3000
```

