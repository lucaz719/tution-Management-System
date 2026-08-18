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
- Branch Admin provides Level 1 Review (Approves or rejects with reason).
- All approved requests are forwarded to Tenant Admin for Level 2 Review.

**UI Changes**:
- Display current monthly limit and remaining balance.
- Request table with "Approve (Forward to Tenant Admin)" and "Reject" actions, requiring a reason input.

**API Gaps**:
- `GET /api/branch-admin/petty-cash/limit-status`: Get current monthly limit and usage.
- `PUT /api/branch-admin/petty-cash/requests/:id/status`: Updates status to `PENDING_TENANT_APPROVAL` upon Branch Admin approval, or `REJECTED` with reason.

## 9. Leave Requests Section
**Requirements**:
- View all leave requests (Staff and Student) sent to the branch.
- Staff Casual Leave & Early Out: Branch Admin approves/rejects directly.
- Staff Long Sick Leave: Branch Admin provides first-level approval, forwards to Tenant Admin.
- Student Advance Leave: Branch Admin approves, teachers notified.
- Student Emergency Out: Branch Admin logs the exit, which triggers immediate push notification to parents.

**UI Changes**:
- Data tables separated by leave type/group (Staff vs Student).
- Action buttons context-aware: "Approve" (Casual/Student), "Approve & Forward" (Sick), "Reject".
- Form to log Student Emergency Out.

**API Gaps**:
- `PUT /api/branch-admin/leave-requests/:id/status`: Update status based on leave type.
- `POST /api/branch-admin/student-leaves/emergency-out`: Log emergency out and trigger notifications.

## 10. Academic Calendar Section
**Requirements**:
- Interactive real calendar for the branch.
- View upcoming events (Quarterly view on dashboard).
- View tenant-pushed events (Public holidays, exam periods) - read-only.
- Add branch-specific events on top of the tenant calendar.

**UI Changes**:
- Full-page calendar component distinguishing tenant events vs branch events (color coding).
- Add event modal (only for branch events).
- Read-only details for tenant events.

**API Gaps**:
- `GET /api/branch-admin/academic-calendar/events`: Fetch events (both tenant and branch).
- `POST /api/branch-admin/academic-calendar/events`: Add new branch-specific event.

## 11. Social Media Management
**Requirements**:
- Create, edit, and delete draft social media posts (Facebook, Instagram, TikTok, LinkedIn).
- Cannot publish directly; submit for Tenant Admin approval.
- View status of drafted, pending, and published posts.

**UI Changes**:
- Post composer with text, image/video upload, platform selection, and scheduling date/time.
- Data table or Kanban board for post statuses (Draft, Pending Approval, Published, Rejected).

**API Gaps**:
- `GET /api/branch-admin/social-media/posts`: Fetch posts.
- `POST /api/branch-admin/social-media/posts`: Create draft post.
- `PUT /api/branch-admin/social-media/posts/:id/submit`: Submit post for tenant approval.

## 12. Certificate Generation
**Requirements**:
- Manually issue certificates (Course Completion, Merit, Attendance, Custom).
- Customize branch-specific details on top of Tenant Admin's master template.

**UI Changes**:
- Certificate issuance modal to select student, certificate type, and fill in branch-specific fields.
- PDF preview before issuance.
- Certificate history log per student.

**API Gaps**:
- `GET /api/branch-admin/certificates/templates`: Fetch master templates.
- `POST /api/branch-admin/certificates/issue`: Issue certificate and generate PDF.

## 13. Student Performance Tracking
**Requirements**:
- Full view across all students and all metrics (Test scores, trends, class comparisons).
- Add administrative remarks per student, visible to admin and teachers (configurable visibility to parents).
- View upgrade/downgrade signals based on performance thresholds.

**UI Changes**:
- Enhanced student profile with "Performance & Analytics" tab showing trend graphs.
- Badges/Icons for upgrade/downgrade signals.
- Form to add and view administrative remarks.

**API Gaps**:
- `GET /api/branch-admin/students/:id/performance`: Fetch performance analytics, trends, and signals.
- `POST /api/branch-admin/students/:id/remarks`: Add administrative remark.

## 14. HR Management
**Requirements**:
- Receive alerts 30 days before staff document/contract expiry.
- View all staff performance scores (attendance, feedback, compliance).
- Initiate and manage formal exit flow (resignation clearance checklist).
- Confirm clearance checklist completion before Tenant Admin settlement.

**UI Changes**:
- Dashboard alerts widget for expiring documents.
- "Performance Score" column in Staff data table.
- "Exit Management" action in Staff profile to initiate/review clearance checklist.

**API Gaps**:
- `GET /api/branch-admin/hr/expiring-documents`: Fetch expiring documents alerts.
- `GET /api/branch-admin/hr/staff-scores`: Fetch staff performance scores.
- `POST /api/branch-admin/hr/exit-clearance`: Update clearance checklist status.

## 15. Resource & Infrastructure Logging
**Requirements**:
- Oversight of daily mandatory resource logs per classroom.
- Override auto-assigned maintenance tasks.
- Escalate unresolved tasks.

**UI Changes**:
- "Resource Logs & Maintenance" view showing daily classroom status.
- Task management table to reassign tasks or escalate.

**API Gaps**:
- `GET /api/branch-admin/resource-logs`: Fetch daily logs and tasks.
- `PUT /api/branch-admin/resource-logs/tasks/:id/reassign`: Reassign or escalate task.
