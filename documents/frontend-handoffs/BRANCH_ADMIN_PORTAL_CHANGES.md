# Branch Admin Portal - Functional Specification & API Gaps

This document outlines the frontend state changes, required UI components, and API gaps necessary to implement the extensive modifications to the Branch Admin Portal.

## 1. Dashboard
**Requirements**: 
- Quick access tools directly accessible from the dashboard.
- Expand icons on all widgets/sections, linking directly to the respective detailed pages.

**UI Changes**:
- Update `BranchAdminDashboard` component to include a grid of summary cards, each equipped with an `Expand` (e.g., Lucide `Maximize2` or `ArrowUpRight`) icon navigating to the specific route (e.g., `/branch-admin/students`).

**API Gaps**: None (Navigation is client-side, assuming existing dashboard summary endpoints provide adequate data).

## 2. Staff & Students Section
**Requirements**:
- Separate Staff (Teachers) and Students sections.
- **Students**: 
  - Profiles with avatar, full details, billing history.
  - Future billing calculations (1-year ahead).
  - Optional extra classes enrollment and billing.
  - Full CRUD capabilities.
- **Staff (Teachers)**:
  - Profiles with full details.
  - Billing/Payroll history and future calculation (1-month ahead).
  - Assigned classes, subjects, syllabus, and progress.
  - Extra classes taught and associated payroll.
  - Timetable viewing and CRUD capabilities.
  - Full CRUD capabilities.

**UI Changes**:
- Two distinct top-level tabs or side-nav items under "People" or just separate "Students" and "Staff" pages.
- Detailed Drawer/Dialog components for Student and Teacher profiles with internal tabs for "Details", "Billing", "Classes/Syllabus", "Timetable".

**API Gaps**:
- `GET /api/branch-admin/students/:id/billing/future`: Endpoint needed to calculate 1-year future billing.
- `GET /api/branch-admin/teachers/:id/payroll/future`: Endpoint needed to calculate 1-month ahead payroll.
- `GET /api/branch-admin/teachers/:id/syllabus-progress`: Endpoint for syllabus tracking.
- Ensure existing Student/Teacher CRUD endpoints support branch-admin roles.

## 3. Attendance Section
**Requirements**:
- Complete attendance details for all teachers, staff, and students.
- Interactive calendar to view daily attendance, including past dates.

**UI Changes**:
- Implementation of a main `Calendar` component (e.g., using `react-big-calendar` or similar).
- When a date is selected, a side panel or modal lists the attendance records for Students, Teachers, and Staff for that specific day.

**API Gaps**:
- `GET /api/branch-admin/attendance/daily?date=YYYY-MM-DD`: Needs to aggregate and return attendance for all groups (Students, Teachers, Staff) for a given date in the branch.

## 4. Personalized Classes Section
**Requirements**:
- Input descriptive details to create personalized classes.
- Manage individual teacher and student profiles (CRUD) specific to these classes.

**UI Changes**:
- New route `/branch-admin/personalized-classes`.
- Form to define personalized class descriptions.
- Section to assign/manage specific students and teachers to these personalized sessions.

**API Gaps**:
- `POST /api/branch-admin/personalized-classes`: Create personalized class.
- `GET/PUT/DELETE /api/branch-admin/personalized-classes/:id`: Standard CRUD.
- Assignment endpoints for teachers/students to these specific classes.

## 5. Homework Section
**Requirements**:
- View all homework assigned today across all classes.
- Interactive calendar to view homework assigned on any specific date.

**UI Changes**:
- A calendar view similar to Attendance.
- Date selection filters a list of homework assignments.

**API Gaps**:
- `GET /api/branch-admin/homework?date=YYYY-MM-DD`: Endpoint to fetch all homework across the branch for a given date.

## 6. Results Section
**Requirements**:
- View results across all classes and subjects.
- Full CRUD operations for branch results (similar to teacher permissions).

**UI Changes**:
- Data table listing results, filterable by class and subject.
- Form/Modal for adding, editing, and deleting results.

**API Gaps**:
- Verify Branch Admin role has authorization to hit existing Results CRUD endpoints (`POST /api/results`, etc.) branch-wide.

## 7. Fee & Billing Section
**Requirements**:
- CRUD for Course fee/billing, Student fee/billing, Teacher fee/billing.
- Apply discount coupons to individual students or whole classes.
- Request discount coupons from Tenant Admin.

**UI Changes**:
- Separate tabs for Course, Student, and Teacher billing.
- "Apply Discount" action in Student/Class tables.
- "Request Coupon" form navigating to a new endpoint.

**API Gaps**:
- `POST /api/branch-admin/discount-coupons/request`: Endpoint to send a request to Tenant Admin.
- `POST /api/branch-admin/billing/apply-discount`: Apply a coupon to a student/class.
- CRUD endpoints for Fee structures.

## 8. Petty Cash Section
**Requirements**:
- Manage requests from Accountants.
- Direct approval if within Tenant Admin-allocated monthly limit.
- If out of limit: Reject, or Approve (which forwards to Tenant Admin).

**UI Changes**:
- Display current monthly limit and remaining balance.
- Request table with "Approve" and "Reject" actions.
- Confirmation dialog explaining that out-of-limit approvals will be forwarded.

**API Gaps**:
- `GET /api/branch-admin/petty-cash/limit-status`: Get current monthly limit and usage.
- `PUT /api/branch-admin/petty-cash/requests/:id/status`: Needs to handle the logic of changing status to `APPROVED` (if within limit) or `PENDING_TENANT_APPROVAL` (if out of limit).

## 9. Leave Requests Section
**Requirements**:
- View all leave requests sent to the branch.
- Branch Admin provides first-level approval/rejection.
- Approvals forward to Tenant Admin for final decision.

**UI Changes**:
- Data table for leave requests.
- Action buttons indicating "Approve & Forward" or "Reject".

**API Gaps**:
- `PUT /api/branch-admin/leave-requests/:id/status`: Needs to update status to `PENDING_TENANT_APPROVAL` upon Branch Admin approval.

## 10. Academic Calendar Section
**Requirements**:
- Interactive real calendar for the branch.
- View upcoming events.
- Click past dates to see past events.

**UI Changes**:
- Full-page calendar component.
- Add event modal.

**API Gaps**:
- `GET /api/branch-admin/academic-calendar/events`: Fetch events.
- `POST /api/branch-admin/academic-calendar/events`: Add new event.
