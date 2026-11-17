# Clinic Management System — Implementation Checklist

## Phase 1: Codebase Audit and Integration Plan
- [x] Inspect existing `prisma/schema.prisma` (`User`, `Role`, `ClinicService`, `ClinicDepartment`, `MedicalStaff`, `Appointment`, `Invoice`, `Payment`, `Notification`, `AuditLog`)
- [x] Inspect existing clinic routes (`app/api/clinic/*`), Paystack routes (`app/api/payments/paystack/*`), and `lib/portal-auth.ts`
- [x] Define non-duplicating schema extensions & RBAC integration plan

## Phases 2–22: Implementation
- [x] Phase 2: Clinic Administration Dashboard (real DB metrics & date filters)
- [x] Phase 3: Patient Registration & Longitudinal Profile (duplicate detection, +233, GHS)
- [x] Phase 4: Appointment Management (calendar, daily/weekly, conflict detection)
- [x] Phase 5: Patient Check-In & Queue Management (queue numbers, priorities, timestamps)
- [x] Phase 6: Clinical Consultation Management (vitals + BMI, draft/completed, amendments + audit)
- [x] Phase 7: Diagnosis & Medical History (multi-diagnosis, catalogue)
- [x] Phase 8: Prescription Management (electronic Rx, print, statuses)
- [x] Phase 9: Pharmacy & Inventory Management (batches, FEFO dispensing, expiry block, low stock)
- [x] Phase 10: Laboratory Management (catalog, requests, workflow, results & review permissions)
- [x] Phase 11: Billing & Invoicing (consultation/lab/medicine/procedure items, discounts, partial payments)
- [x] Phase 12: Payment Management (Cash/MoMo/Card/Bank + Paystack Ghana reuse, refunds, webhooks)
- [x] Phase 13: Clinic Services & Departments (configurable CRUD)
- [x] Phase 14: Clinic Staff Management (existing `User` identity + `ClinicStaffProfile` roles)
- [x] Phase 15: Patient Document Management (private `storage/clinic-documents/`, RBAC download)
- [x] Phase 16: Patient Portal (`/portal/patient` — strictly own records only)
- [x] Phase 17: Notifications (appointment, payment, lab result release)
- [x] Phase 18: Clinic Reporting (patient, appointment, financial, pharmacy, lab + CSV)
- [x] Phase 19: Administration & Audit Controls (`AuditLog` integration)
- [x] Phase 20: Clinic Interface & User Experience (`/portal/clinic`)
- [x] Phase 21: Database & Backend Implementation (`prisma db push` + transactions)
- [x] Phase 22: Security & Privacy (RBAC, input validation, private medical records)

## Phase 23: End-to-End Testing & Final Acceptance
- [x] `scripts/verify-clinic-system.js` (full 16-step visit + edge cases)
- [x] `npm run build` & all existing platform regression suites
