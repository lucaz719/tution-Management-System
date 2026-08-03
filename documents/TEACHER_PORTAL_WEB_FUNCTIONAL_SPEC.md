# TMS Teacher Portal — Web Functional and QA Specification

Version: 1.0  
Date: 3 August 2026  
Scope: Authenticated Teacher; assigned branches, classes, sessions, and enrolled students only

## 1. Purpose and privacy boundary

The Teacher Portal is a mobile-first workspace for completing time-sensitive teaching operations. Every server query is scoped by the authenticated tenant and the teacher's own class assignment. A teacher cannot view another teacher's roster, results, attendance, payroll, performance score, syllabus, homework, or leave history.

## 2. Navigation

The portal contains Dashboard, My Timetable, Attendance, Syllabus, Daily Update Log, Homework, Results, My Profile, Leave Requests, and Salary Slips. Every route is addressable at `/teacher/{section}` and remains available on mobile navigation.

## 3. Dashboard

### Data shown

- Own geo-attendance rate, present-day count, approved-leave count, teaching-session count, daily-update compliance, and assigned-class count.
- Today's class sessions with subject, class, branch, schedule, and update status.
- Current campus state and the scheduled branch geofence.
- Pending daily class updates and direct classroom shortcuts.

### Validation and edge cases

- No assigned session: show an explicit empty state.
- No branch: disable Mark IN/OUT and explain that an assignment is required.
- GPS denied/unavailable/outside geofence: preserve the previous state and show the server/device error.
- All statistics are computed from the authenticated teacher's records only.

## 4. Timetable

The weekly timetable lists every assigned class and schedule slot independently, including day, start/end time, subject, class, branch, room/class label, class type, and enrolled-student count. Multi-branch slots retain their own branch and geofence rather than using a home branch.

## 5. Class attendance

The teacher selects one assigned class, reviews historical class statistics, and marks every active student Present or Absent.

- Fee-blocked students have Present disabled in the UI and rejected by the API.
- Approved leave overlapping the selected date is server-normalized to Excused.
- Students outside the selected roster are rejected.
- Existing attendance marked by that teacher for the same generated session is replaced atomically.
- Success updates the student portal attendance record after refresh.

## 6. Syllabus and daily progress

The teacher selects an assigned class, records the subject, and enters one chapter per line. A class/subject pair has one syllabus. Each chapter has one current state:

- Yellow — In progress
- Green — Completed
- Red — Left / not covered

The teacher can update a chapter once per teaching day with an optional note. Repeating the update on the same day revises that day's record rather than creating duplicates. The enrolled student's read-only Syllabus Progress section receives the chapter list, status, date, and teacher note on refresh.

## 7. Mandatory daily update

A completed TeacherSession remains `PRESENT_UPDATE_PENDING` until the assigned teacher submits what was covered, issues, observations, and homework notes. Only the session owner can submit. A successful submission changes the session to `PRESENT_CONFIRMED`; repeat submissions return a conflict response.

## 8. Homework

The teacher selects an assigned class and enters title, text questions/instructions, due date, and an optional PDF/document/image attachment. The current secure JSON attachment preview is limited to 120 KB. The API validates class ownership before creating the assignment. Every active enrolled student receives the same read-only assignment through their Student Portal.

Failure cases include missing required fields, unassigned class, invalid due date, oversized/unreadable file, and expired authentication.

## 9. Results

The result workflow separates saving from publishing:

1. Select an assigned class.
2. Enter assessment, test date, full marks, pass marks, and every student's obtained marks.
3. Optionally attach a result sheet (120 KB preview limit).
4. Save a private draft.
5. Review automatically calculated percentile.
6. Share each verified result.

Marks must be numeric, non-negative, and no greater than full marks. Pass marks must be between zero and full marks. Percentile is the percentage of the submitted class cohort scoring at or below that student. Draft rows have `publishedAt = null` and are excluded from the Student Portal. Sharing stamps `publishedAt` and makes the result, pass marks, percentile, and attachment available to that student.

## 10. My Profile

The teacher sees full name, email, designation, contract type, joining date, assigned branches, own attendance rate, own update compliance, and unmerged attendance-stamp history. Institutional profile fields are read-only. No other teacher's performance or stamps are queried.

## 11. Leave requests

The teacher can submit Casual, Early-out, or Long Sick leave for an assigned branch and review status history. Casual/Early-out follow branch approval. Long Sick follows Branch Admin level 1 and Tenant Admin level 2. Missing branch, invalid dates, missing reason, or out-of-scope branch are rejected.

## 12. Salary slips

The portal reads the authenticated teacher's StaffRecord and Payroll rows. It shows the next Pending calculation as upcoming pay and a history table with period, base salary, attendance deductions, bonuses, net payable, settlement status, and payment date. Teachers cannot edit payroll or access another staff record.

## 13. Student synchronization

- Attendance: Student Portal attendance refresh.
- Syllabus: Student Portal Syllabus Progress refresh.
- Homework: Student Portal Homework refresh.
- Results: Student Portal Results refresh only after Share.
- Daily updates: remain operational/admin records; syllabus status is the student-facing progress channel.

## 14. Accessibility and responsive requirements

- Semantic buttons, labels, fieldsets, tables, status regions, and heading order.
- Visible focus indicators and 40 px minimum interactive targets.
- Status is conveyed by text and color.
- Mobile layouts at 320/375 px, tablet at 768 px, and desktop at 1280/1440 px.
- Loading skeleton, empty states, errors with retry, disabled/busy states, and reduced-motion support.
- Style source: `apps/web/src/index.css`; Fraunces display, Roboto UI, locked blue/gold/status palette, structured-soft radii, and Silk motion.

## 15. QA acceptance checklist

- [ ] Teacher A cannot request Teacher B's class, roster, syllabus, results, or payroll by changing an ID.
- [ ] Dashboard statistics use only Teacher A's records.
- [ ] Timetable renders zero, one, multiple, personalized, and multi-branch schedules.
- [ ] Fee-blocked Present is disabled and server-rejected.
- [ ] Approved student leave becomes Excused.
- [ ] Syllabus duplicate class/subject returns conflict.
- [ ] Daily chapter update changes both teacher and student views.
- [ ] Homework text and optional attachment appear for every active enrollee.
- [ ] Invalid marks/pass marks are rejected.
- [ ] Result draft is invisible to Student; Share makes it visible.
- [ ] Percentile is correct for tied and unique scores.
- [ ] Leave follows branch scope and approval status.
- [ ] Salary history is read-only and teacher-scoped.
- [ ] Keyboard-only operation completes every form.
- [ ] Loading, empty, error, success, and retry states are visible and understandable.
