# Advanced Examination Management & Automated Online Examination System — Development Checklist (Phases 1–21)

## Phase 1 — System Audit & Architecture Alignment
- [x] Inspect `prisma/schema.prisma` (`Examination`, `Question`, `ExamAttempt`, `TopicQuestion`, `AcademicYear`, `Semester`, `Programme`, `Course`, `Cohort`, `Student`, `CourseRegistration`, `Invoice`, `GradeScale`, `ContinuousAssessment`)
- [x] Inspect `app/api/admin/examinations/route.ts`, `app/api/student/exams/[id]/route.ts`, `app/api/student/exams/[id]/submit/route.ts`
- [x] Inspect `app/portal/student/exams/page.tsx`, `app/portal/student/exams/start/page.tsx`, and `app/portal/admin/page.tsx`
- [x] Identify gaps (no `ExaminationPeriod`, no `ExaminationSection`, no `ExamAnswer`, no `ExaminationActivityLog`, no `ExamAttempt` timer/autosave/random-paper persistence, student exams directory uses static cards, admin lacks `/portal/admin/examinations`)
- [x] Define non-duplicating Prisma schema extensions reusing `AcademicYear`, `Semester`, `Programme`, `Course`, `Cohort`, `Student`, `CourseRegistration`, `Invoice`, `TopicQuestion`, `Question`, `ContinuousAssessment`

## Phase 2 — Prisma Schema & Database Migration
- [x] Add `ExaminationPeriod` model (with `academicYearId`, `semesterId`, `status`, `startDate`, `endDate`, `resultsPublishedAt`, delete-protection if completed exams/attempts exist)
- [x] Extend `Examination` (`periodId`, `examType`, `academicYearId`, `semesterId`, `cohortId`, `startTime`, `endTime`, `mode`, `randomizeQuestions`, `randomizeOptions`, `selectionMode`, `publicationMode`, `publishAt`, `requireFinancialClearance`, `integrityPolicyJson`, `maxRetakes`)
- [x] Add `ExaminationSection` model (Section A/B/C, marks allocation, question count, random selection rules)
- [x] Extend `Question` (`sectionId`, `topicQuestionId` optional link to `TopicQuestion` bank)
- [x] Extend `ExamAttempt` (`attemptNumber`, `startedAt`, `expiresAt`, `lastSavedAt`, `assignedPaperJson`, `flaggedQuestionsJson`, `accessToken`, `integrityEventsCount`)
- [x] Add `ExamAnswer` model (`attemptId`, `questionId`, `answerText`, `selectedOption`, `isFlagged`, `isCorrect`, `marksAwarded`, `maxMarks`, `evaluationStatus`, `feedback`, `savedAt`, `@@unique([attemptId, questionId])`)
- [x] Add `ExaminationActivityLog` model (`attemptId`, `eventType`, `detailsJson`, `createdAt`)
- [x] Run `npx prisma db push && npx prisma generate`

## Phase 3 — Examination Periods & Scheduling Rules API
- [x] Implement CRUD for `ExaminationPeriod` in `app/api/admin/examinations/periods/route.ts` (or action handlers)
- [x] Enforce deletion guard: block deleting an `ExaminationPeriod` when linked examinations have `CONCLUDED` status or submitted `ExamAttempt`s

## Phase 4 — Exam Creation, Sections & Question Bank Linking API
- [x] Extend `app/api/admin/examinations/route.ts` to support sections (`ExaminationSection`), `examType`, `mode`, `selectionMode`, `publicationMode`, `requireFinancialClearance`, `integrityPolicyJson`, `maxRetakes`
- [x] Support importing/linking `TopicQuestion` bank items into `Examination` (`topicQuestionId`) with one-time rubric preservation

## Phase 5 — Eligibility Engine (Registration + Financial Clearance + Retakes)
- [x] Build shared eligibility helper (`checkExamEligibility`) verifying active `CourseRegistration`, exam time window (`startTime`/`endTime`), `maxRetakes`, and `Invoice` balance when `requireFinancialClearance` is enabled
- [x] Return structured eligibility reasons to student directory and start endpoint

## Phase 6 — Secure Exam Session Start, Random Paper & Timer Persistence
- [x] Implement `POST /api/student/exams/[id]/start` to check eligibility, create/resume `IN_PROGRESS` `ExamAttempt`, generate and persist `assignedPaperJson` (randomized question & option order), compute `startedAt` and `expiresAt`, and issue `accessToken`

## Phase 7 — Real-Time Answer Autosave & Flagging
- [x] Implement `PATCH /api/student/exams/[id]/autosave` to upsert `ExamAnswer` rows (`answerText`, `selectedOption`, `isFlagged`, `savedAt`), update `ExamAttempt.lastSavedAt` & `flaggedQuestionsJson`, and enforce server-side `expiresAt` timer cutoff

## Phase 8 — Integrity Monitoring & Activity Logging
- [x] Implement `POST /api/student/exams/[id]/activity` to record `ExaminationActivityLog` events (`TAB_SWITCH`, `FULLSCREEN_EXIT`, `COPY_ATTEMPT`, `FOCUS_LOST`, `HEARTBEAT`) and increment `ExamAttempt.integrityEventsCount`

## Phase 9 — Automated Grading, Idempotent Submission & Publication Modes
- [x] Update `app/api/student/exams/[id]/submit/route.ts` to grade from `ExamAnswer` / `answers`, persist per-question `ExamAnswer` grades/feedback, enforce `idempotencyKey`, handle `FAILED` without silent 0, and respect `publicationMode` (`IMMEDIATE`, `SCHEDULED`, `AFTER_PERIOD`) + `publishAt`

## Phase 10 — Auto-Expiry Sweep & Continuous Assessment Sync
- [x] Auto-submit expired `IN_PROGRESS` attempts when `expiresAt` has passed on fetch/admin monitor
- [x] Sync published `ExamAttempt` scores into `ContinuousAssessment` via `recalculateContinuousAssessment`

## Phase 11 — Student Examinations Directory UI (`/portal/student/exams`)
- [x] Replace static cards with dynamic `/api/student/exams` directory showing `UPCOMING`, `ACTIVE`, `CONCLUDED`, eligibility badges, financial clearance warnings, attempt count, and published scores

## Phase 12 — Student Online CBT Examination Runner UI (`/portal/student/exams/start`)
- [x] Support sectioned exam navigation, question palette with answered/flagged indicators, live server-synced countdown timer, real-time autosave indicator, integrity event reporting (tab switch/fullscreen), and post-submission report gated by `publicationMode` & `answerKeyReleaseAt`

## Phase 13 — Admin Examination Management Portal (`/portal/admin/examinations`)
- [x] Build `/portal/admin/examinations/page.tsx` with tabs for Examination Periods, Exams & Sections Builder, Question Bank Importer, Live Attempt Monitor & Integrity Logs, Failed Grading Retry, and Scheduled/Period Result Publication
- [x] Link from `app/portal/admin/page.tsx` Exams & Results tab

## Phase 14 — Lecturer Exam Monitoring & Analytics Visibility
- [x] Allow assigned lecturers to view exam schedules, attempt statuses, and integrity summaries for their courses

## Phase 15 — Notifications & Audit Logging
- [x] Log `ExaminationPeriod`, `Examination`, publication, and retry actions via `logAcademicAudit`
- [x] Send deduplicated student notifications on exam publication and grading recovery

## Phase 16 — Build & TypeScript Verification
- [x] Run `npx tsc --noEmit` (0 errors in new/modified files)
- [x] Run `npm run build` (0 errors)

## Phase 17 — End-to-End Verification Script (`scripts/verify-exam-system.js`)
- [x] Test Period CRUD + delete protection, Sections + `TopicQuestion` linking, Financial Clearance & Registration eligibility, Random Paper persistence, Autosave + Flagging, Integrity Activity Logs, Server Timer expiry, Publication modes (`IMMEDIATE`/`SCHEDULED`/`AFTER_PERIOD`), Automated Grading + CA sync

## Phase 18–21 — Full Regression Suite & Production Sign-Off
- [x] Restart production server on port 3000
- [x] Run `verify-exam-system.js` + all 7 existing verification suites (`verify-auto-grading.js`, `verify-academic-portal.js`, `verify-ai-pdf-upgrade.js`, `verify-pdf-learning.js`, `verify-school-admin.js`, `verify-phase2.js`, `verify-all.js`)
- [x] Confirm 100% pass rate across all suites and update checklist
