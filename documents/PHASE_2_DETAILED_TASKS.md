# Tution Management System (TMS) - Phase 2: Academic & Operations
## Detailed Task List
**Phase Timeline:** July 21 - August 4, 2026 (15 calendar days)  
**Based on:** SOW-001 Section 2 (Phase 2 Scope) and existing codebase analysis  
**Prerequisites:** Phase 1 Core Foundation completed and accepted  

---

## Phase 2 Overview
Phase 2 focuses on academic operations, student-teacher-parent engagement, and administrative intelligence. It builds upon the Phase 1 foundation (authentication, multi-tenancy, basic attendance/billing) to add:

1. **Academic Workflow Management** - Homework, results, assessments
2. **Enhanced Communication** - Threaded messaging, announcements, appointments
3. **Administrative Automation** - Certificate generation, academic calendar, HR tools
4. **Intelligence Layer** - AI-assisted financial insights (foundation for Phase 3 ERP)

**Note:** Phase 2 delivers 37,500 NPR upon client acceptance (Milestone 3 per SOW-001).

---

## Detailed Task Breakdown

### 1. Homework Management System
*Enables teachers to create, distribute, collect, and grade assignments*

**Backend Tasks:**
- [ ] Create `homework` table in Prisma schema (with fields: id, title, description, dueDate, maxPoints, classId, teacherId, createdAt, updatedAt, status)
- [ ] Create `homework_submissions` table (studentId, homeworkId, content, fileUrl, grade, feedback, submittedAt, gradedAt)
- Implement homework CRUD API endpoints in `src/routes/homework.ts`:
  - POST `/homework` (create)
  - GET `/homework/:classId` (list for class)
  - GET `/homework/:id` (get single)
  - PUT `/homework/:id` (update)
  - DELETE `/homework/:id` (delete)
  - POST `/homework/:id/submit` (student submission)
  - PUT `/homework/submissions/:id/grade` (teacher grading)
- Add homework validation middleware (due date formatting, file size limits)
- Implement file upload handling for assignment submissions (using existing upload utilities)
- Create notification triggers for:
  - Homework assigned (to students/parents)
  - Submission received (to teacher)
  - Grading completed (to student/parent)
  - Due date reminders (24h before)
- Add homework statistics to relevant dashboard APIs
- Write unit/integration tests for homework endpoints
- Extend `test-tms.ts` to cover homework workflows

**Frontend Web Tasks:**
- Create homework management pages:
  - Teacher: Create/Edit Assignment Form
  - Teacher: Assignment List (with submission status)
  - Teacher: Submission Review & Grading Interface
  - Student: My Assignments (todo/in-progress/graded)
  - Student: Assignment Submission Form
  - Parent: Child's Assignments Overview
- Build reusable homework components:
  - AssignmentCard (with status badges)
  - SubmissionList (with file preview)
  - GradingForm (with rubric support)
  - FileUploader (drag/drop with validation)
- Implement homework state management (React Context or Zustand)
- Add homework sections to:
  - Teacher Dashboard (upcoming/pending grading)
  - Student Home (today/tomorrow due)
  - Parent Home (children's assignment status)
- Create homework notifications UI (in-app bell icon)
- Style components per PRD design system (Fraunces/Roboto, spacing scale)
- Ensure responsive behavior (mobile/tablet/desktop)
- Write unit/tests for homework components

**Mobile Tasks (Flutter):**
- Teacher App: Assignment creation/editing screen
- Teacher App: Submission review interface (with inline commenting)
- Student App: Assignment list + submission flow
- Parent App: Child's assignment tracker
- Implement file picker for assignment submissions
- Add homework notifications to notification center
- Optimize for low-bandwidth (compress submissions, offline queue)

**Dependencies:** 
- Authentication system (teacher/student/parent roles)
- Class/timetable system (to associate homework with classes)
- Notification foundation (SMS/Push from Phase 1)

**Estimated Effort:** 3.5 days

---

### 2. Results & Academic Performance Tracking
*Manages exams, grades, report cards, and academic analytics*

**Backend Tasks:**
- [ ] Create `exams` table (examType, subjectId, classId, date, maxScore, term)
- [ ] Create `student_results` table (studentId, examId, marksObtained, grade, remarks)
- [ ] Create `grade_constants` table (for A/B/C/D/F boundaries per subject/class)
- Implement exam/results CRUD API in `src/routes/performance.ts`:
  - POST `/exams` (create exam)
  - GET `/exams/:classId` (list exams for class)
  - POST `/results` (record student results)
  - GET `/results/:studentId` (student's result history)
  - GET `/results/class/:classId` (class-wide results for teacher)
  - GET `/results/summary/:studentId` (GPA/percentage calculations)
- Add result validation (marks within bounds, duplicate prevention)
- Implement report card generation service (PDF export)
- Create academic analytics endpoints:
  - Class average by subject
  - Student progress trends
  - Pass/fail rates
- Integrate with existing `courses` and `grades` modules
- Add result notification triggers:
  - Results published (to students/parents)
  - Low performance alerts (configurable threshold)
- Extend `test-tms.ts` for results workflows

**Frontend Web Tasks:**
- Exam management interface (for teachers/academic coordinators):
  - Create Exam Form (with subject/class/date selection)
  - Exam List/Calendar view
- Results entry grid (teacher inputs marks for all students in exam)
- Student result view:
  - Individual exam performance
  - Term-wise summary (GPA, percentage, grade)
  - Comparative analytics (class average, rank)
- Parent/Student portal: 
  - Results history tab
  - Downloadable report card (PDF)
  - Performance trend charts
- Teacher dashboard: 
  - Class performance overview
  - At-risk students identification
- Reusable components:
  - ResultTable (with sorting/filtering)
  - GradeBadge (color-coded by performance)
  - ProgressChart (line/bar for trends)
  - ReportCardViewer (PDF preview/download)
- Academic calendar integration (exam dates visible in calendar view)

**Mobile Tasks:**
- Teacher App: 
  - Exam creation/modification
  - Bulk results entry interface (optimized for tablet)
- Student/Parent App:
  - Results viewing (with share/print options)
  - Upcoming exams notification
  - Result history timeline

**Dependencies:**
- Class/timetable system (exam scheduling)
- Student enrollment (to know who's in each class)
- Notification foundation
- File storage (for report card PDFs)

**Estimated Effort:** 3.0 days

---

### 3. Teacher Daily Verification System
*Mandatory end-of-day checkout to confirm all duties completed*

**Backend Tasks:**
- [ ] Create `daily_verifications` table (teacherId, date, status, notes, completedAt)
- [ ] Create `daily_tasks` template table (pre-defined daily duties per role)
- Implement verification API in `src/routes/teacher.ts`:
  - POST `/daily-verification` (submit completion)
  - GET `/daily-verification/:teacherId/:date` (get status)
  - GET `/daily-verification/pending` (for admin oversight)
- Add validation logic:
  - Prevent duplicate submissions per day
  - Require minimum checklist completion (configurable)
  - Allow notes/comments for exceptions
- Create scheduled job to:
  - Auto-mark incomplete verifications as "Missed" at midnight
  - Send reminders 30min before deadline
  - Generate daily compliance report for admins
- Integrate with existing leave system (auto-excuse if on approved leave)
- Add verification status to teacher profile/dashboard APIs
- Extend `test-tms.ts` for verification workflows

**Frontend Web Tasks:**
- Teacher Dashboard: 
  - Daily Verification Widget (prominent end-of-day reminder)
  - Checklist interface (with tick boxes and notes field)
  - Submission confirmation modal
  - History view (past submissions with status)
- Admin Oversight Interface:
  - Daily compliance report (by teacher/department)
  - Flag consistently incomplete submissions
- Notification components:
  - Reminder banner (appears 1hr before deadline)
  - Missed submission alert (to teacher + branch admin)
- Status indicators:
  - Today's verification status in teacher profile menu
  - Small badge on dashboard when pending
- Implement offline capability (queue submissions if disconnected)

**Mobile Tasks:**
- Teacher App: 
  - Daily verification screen (large touch targets for end-of-day use)
  - Push notification at configurable reminder time
  - Offline-capable submission (sync when back online)
  - Quick-access from home screen (floating action button or bottom tab)

**Dependencies:**
- Teacher authentication and role system
- Schedule/timetable (to know expected working hours)
- Notification foundation
- Leave integration (to auto-handle approved absences)

**Estimated Effort:** 2.0 days

---

### 4. Communication Hub (Threaded Messaging)
*Secure, role-based messaging between all stakeholders*

**Backend Tasks:**
- [ ] Create `conversations` table (id, type, title, createdBy, createdAt, updatedAt)
- [ ] Create `participants` table (conversationId, userId, role, joinedAt, leftAt)
- [ ] Create `messages` table (id, conversationId, senderId, content, attachments, sentAt, readAt, editedAt)
- [ ] Create `message_attachments` table (for file sharing)
- Implement messaging API in `src/routes/communication.ts`:
  - POST `/conversations` (create new conversation)
  - GET `/conversations` (user's conversations with last message preview)
  - GET `/conversations/:id/messages` (paginated message history)
  - POST `/conversations/:id/messages` (send new message)
  - PUT `/messages/:id/read` (mark as read)
  - PUT `/messages/:id` (edit message - within time window)
  - DELETE `/messages/:id` (soft delete for sender only)
  - POST `/conversations/:id/participants` (add users to group chat)
  - DELETE `/conversations/:id/participants/:userId` (remove participant)
- Add real-time capabilities:
  - Integrate WebSocket library (Socket.IO) for live updates
  - Presence indicators (typing, online/offline status)
  - Message read receipts
- Implement file upload handling for attachments (images, PDFs)
- Add moderation tools:
  - Report message functionality
  - Delete message (for admins/teachers in class chats)
  - Profanity filter (basic implementation)
- Create notification triggers:
  - New message received
  - Mention notification (@username)
  - Reaction added (if implemented later)
- Add conversation archiving/favoriting
- Implement message search (full-text search on content)
- Extend `test-tms.ts` for messaging scenarios

**Frontend Web Tasks:**
- Build chat interface components:
  - ConversationList (sidebar with avatars and last message preview)
  - MessageList (virtualized list for performance)
  - MessageInput (with attachment picker, emoji picker, send button)
  - Individual MessageBubble (with sender avatar, timestamp, read receipts)
  - AttachmentPreview (for images, documents)
  - TypingIndicator
  - OnlineStatusBadge
- Create chat views:
  - Direct Message List (filter by recent/unread)
  - Group Chat Screen (with participant list)
  - Announcement Broadcast (one-to-many from admin/teacher)
  - Class/Group Chat (auto-created for each class/section)
- Implement real-time updates via WebSocket connection
- Add message features:
  - Reply-to-specific-message (quote reply)
  - Reaction emojis (👍, ❤️, etc.)
  - Link previews
  - File sharing (with size/type limits)
  - Message editing/deletion (with time limits)
  - Search within conversation
- Notification integration:
  - In-app badge for unread messages
  - Desktop notifications (when tab inactive)
  - Mobile push notification fallback
- Accessibility:
  - Keyboard navigation
  - Screen reader support for message announcements
  - High contrast mode compatibility
- Performance optimizations:
  - Message virtualization (only render visible items)
  - Pagination for history loading
  - Offline message queue (send when reconnected)

**Mobile Tasks (Flutter):**
- Chat screen with Material/Cupertino design
- Real-time messaging via WebSocket/Socket.IO
- Push notifications for new messages (when app in background)
- Camera/gallery integration for instant photo sharing
- Voice message recording (optional enhancement)
- Offline message queuing with sync
- Chat heads/chat bubbles (Android-specific feature consideration)

**Dependencies:**
- User authentication and role system
- Notification foundation (from Phase 1)
- File storage service
- Real-time infrastructure (WebSocket setup)
- Contact list/address book (from user profiles)

**Estimated Effort:** 4.0 days (most complex feature)

---

### 5. Appointment Booking System
*For parent-teacher meetings, student counseling, administrative consultations*

**Backend Tasks:**
- [ ] Create `appointments` table (id, title, description, startTime, endTime, location, type, status, createdBy, relatedStudentId, relatedTeacherId, createdAt, updatedAt)
- [ ] Create `appointment_attendees` table (appointmentId, userId, role, status, responseTime)
- Implement appointment API in `src/routes/appointments.ts`:
  - POST `/appointments` (create booking request)
  - GET `/appointments` (user's appointments with filters)
  - GET `/appointments/:id` (appointment details)
  - PUT `/appointments/:id` (reschedule/update)
  - DELETE `/appointments/:id` (cancel)
  - PUT `/appointments/:id/respond` (accept/decline/tentative)
  - GET `/appointments/availability/:date` (get free slots for user)
- Add booking logic:
  - Prevent double-booking for resources (rooms, teachers)
  - Enforce business hours (configurable per tenant/branch)
  - Allow buffer times between appointments
  - Support recurring appointments (weekly office hours)
- Implement reminder system:
  - 24-hour and 1-hour pre-appointment reminders
  - Configurable reminder channels (SMS, push, email)
- Create calendar integration (iCal/Google Calendar export)
- Add waiting list functionality for fully booked slots
- Implement admin controls:
  - Block time ranges (for meetings, training)
  - Set booking windows (how far in advance can book)
  - Define appointment types (consultation, disciplinary, etc.)
- Extend `test-tms.ts` for appointment workflows

**Frontend Web Tasks:**
- Booking interface:
  - Date picker with available time slots highlighted
  - Duration selector (15min, 30min, 60min options)
  - Purpose/category selection (dropdown)
  - Attendee selection (for scheduling on behalf of others)
  - Location/room selection (if applicable)
- Calendar views:
  - Month view (with appointment dots)
  - Week view (detailed time slots)
  - Day view (hourly schedule)
  - Agenda/list view (upcoming appointments)
- Appointment details modal:
  - Show all details + attendee list
  - Reschedule/cancel options
  - Add notes before responding
- Integration points:
  - Teacher dashboard: "Office Hours" booking link
  - Parent dashboard: "Request Meeting with Teacher" button
  - Student dashboard: "Counseling Appointment" option
  - Admin dashboard: Resource management (rooms, equipment)
- Notification components:
  - Appointment reminders (in-app + push)
  - Confirmation/cancellation alerts
  - Reschedule notifications
- Conflict detection UI:
  - Visual indicators when trying to book occupied time
  - Suggest alternative slots
- Mobile-responsive design (touch-friendly date/time pickers)

**Mobile Tasks:**
- Unified appointment booking flow across roles
- Calendar integration with device calendar (add to Google/Apple Calendar)
- Push notifications for reminders
- Quick-add from home screen (fab or shortcut)
- Offline viewing of upcoming appointments
- QR code generation for check-in (optional)

**Dependencies:**
- User calendar/availability (from timetable for teachers/students)
- Notification system
- Location/room management (could tie into existing resources module)
- Role-based permissions (who can book whom)

**Estimated Effort:** 3.0 days

---

### 6. Certificate Generation
*Automated creation of achievement, completion, and participation certificates*

**Backend Tasks:**
- [ ] Create `certificate_templates` table (id, name, description, designJson, isActive, createdBy)
- [ ] Create `certificates` table (id, templateId, recipientId, issuedBy, issuedFor, dataJson, issuedAt, expiresAt, certificateId)
- Implement certificate API in `src/routes/certificates.ts`:
  - POST `/certificates/templates` (create/update template)
  - GET `/certificates/templates` (list available templates)
  - GET `/certificates/templates/:id` (get template details)
  - POST `/certificates/issue` (generate certificate from template)
  - GET `/certificates/:id` (get certificate details + PDF)
  - GET `/certificates` (user's certificates with filters)
  - PUT `/certificates/:id/revoke` (admin revoke)
- Implement template system:
  - JSON-based layout definition (positions, fonts, colors, dynamic fields)
  - Support for certificate types: completion, achievement, participation, excellence
  - Dynamic data mapping (student name, course, date, instructor, etc.)
- Create PDF generation service:
  - Use library like PDFKit or Puppeteer
  - Merge template with recipient data
  - Add security features (watermark, unique ID, QR code for verification)
- Implement certificate storage:
  - Store generated PDFs temporarily/permanently
  - Generate unique verification URL (e.g., /verify/cert/abc123)
- Add verification endpoint:
  - GET `/certificates/verify/:id` (public validation without login)
- Create issuance workflows:
  - Auto-issuance upon course completion (trigger from courses module)
  - Manual issuance via admin/teacher interface
  - Bulk issuance for events/achievements
- Add notification triggers:
  - Certificate issued (to recipient)
  - Certificate available for download
- Extend `test-tms.ts` for certificate flows

**Frontend Web Tasks:**
- Template Management (Admin/Teacher):
  - Template library viewer (preview different designs)
  - Template editor (drag/drop fields onto canvas)
  - Field mapping interface (connect data sources to placeholders)
  - Preview mode (with sample data)
- Issuance Interface:
  - Certificate type selector
  - Recipient search (students, teachers, staff)
  - Custom message field
  - Preview before issuing
  - Bulk issuance tool (for class-wide awards)
- Certificate Viewing/Receiving:
  - My Certificates page (list with thumbnails)
  - Certificate detail view (full-size preview)
  - Download as PDF button
  - Share via email/social media button
  - Verify authenticity link (to public verification page)
- Integration Points:
  - Course completion: "Generate Certificate" button on course page
  - Achievement modules: Award ceremony workflow
  - Teacher dashboard: Recognize outstanding students
  - Admin dashboard: Certificate issuance analytics
- Design Components:
  - CertificateCard (responsive preview)
  - TemplateBuilder (drag/drop UI)
  - CertificateViewer (full-screen/mode)
  - ShareModal (email, social, download options)
- Ensure print-friendly CSS for PDF generation
- Add watermarking and security features visible in preview

**Mobile Tasks:**
- Certificate viewing in student/parent apps
- Share certificate via device sharing menu
- QR code scanning for verification (in admin apps for validation)
- Push notifications when certificate issued
- Offline viewing of previously earned certificates

**Dependencies:**
- User profiles (for recipient data)
- Course/completion tracking (from homework/results modules)
- Notification system
- File storage (for template assets and generated PDFs)
- Potential integration with design tools (if using complex templates)

**Estimated Effort:** 2.5 days

---

### 7. Academic Calendar
*Centralized scheduling of school events, holidays, exams, and important dates*

**Backend Tasks:**
- [ ] Create `calendar_events` table (id, title, description, startDate, endDate, eventType, visibility, createdBy, relatedClassId, relatedCourseId, createdAt, updatedAt)
- [ ] Create `calendar_categories` table (color, icon, name - e.g., "Holiday", "Exam", "Parent-Teacher Meeting")
- Implement calendar API in `src/routes/academic-events.ts` (note: file already exists - enhance it):
  - POST `/academic-events` (create event)
  - GET `/academic-events` (list with filters: date range, type, visibility)
  - GET `/academic-events/:id` (get event details)
  - PUT `/academic-events/:id` (update)
  - DELETE `/academic-events/:id` (delete)
  - GET `/calendars/:viewType` (month/week/day aggregated views)
- Add event types:
  - Fixed date (single day)
  - Date range (multi-day events)
  - Recurring (weekly, monthly, yearly patterns)
  - Blocked time (no scheduling allowed)
- Implement visibility controls:
  - Public (visible to all roles)
  - Role-specific (teachers only, parents only, etc.)
  - Audience-specific (specific classes, grades, or groups)
- Create calendar synchronization:
  - iCal feed generation (for subscription in external calendars)
  - Google/Outlook calendar push (optional enhancement)
- Add event reminders/configurable notifications:
  - Email/SMS/Push reminders (1 day, 1 hour before)
  - Recurring reminders (for multi-day events)
- Implement conflict detection:
  - Warn when scheduling over blocked time
  - Suggest alternatives for popular time slots
- Integrate with existing modules:
  - Auto-add exam dates from results module
  - Auto-add holiday lists from tenant settings
  - Sync with timetable (block teaching hours for events)
- Extend `test-tms.ts` for calendar scenarios

**Frontend Web Tasks:**
- Calendar Views:
  - Month view (compact, with event dots/color indicators)
  - Week view (detailed hourly slots)
  - Day view (detailed timeline)
  - Agenda/list view (chronological upcoming events)
  - Year view (overview of major terms/holidays)
- Event Creation/Editing:
  - Form with title, description, date/time, recurrence options
  - Category/color selection (with predefined palette)
  - Visibility/target audience selector
  - Location field (with autocomplete from rooms/resources)
  - Attachment/upload capability (agendas, minutes)
- Event Interaction:
  - Click to view details
  - RSVP functionality (for meetings/required attendance)
  - Add to personal calendar button (iCal download)
  - Comment/discussion thread (lightweight)
- Calendar Management:
  - Drag-and-drop rescheduling (day/week views)
  - Copy/paste events between dates
  - Bulk operations (delete multiple, change visibility)
- Integration Points:
  - Teacher Dashboard: Today's events + teaching schedule overlay
  - Student/Parent Dashboard: Upcoming events relevant to them
  - Admin Dashboard: Calendar overview + conflict alerts
  - Class Pages: Events specific to that class/group
- UI Components:
  - CalendarHeader (with view toggles)
  - DayCell (with dot indicators for multiple events)
  - EventItem (color-coded with tooltip preview)
  - DatePicker (inline and modal variants)
  - RecurrenceRuleBuilder (for complex patterns)
- Features:
  - Today indicator
  - Weekend highlighting
  - Holiday marking (from tenant configuration)
  - School term shading
  - Print/export calendar view (PDF/PNG)
- Responsive design:
  - Touch-friendly controls for mobile
  - Collapsible sidebar on narrow screens
  - Agenda view as primary on mobile

**Mobile Tasks:**
- Agenda view as primary interface (optimized for mobile)
- Quick-add event from floating action button
- Calendar widget for home screen (showing today/tomorrow)
- Deep linking: tapping calendar notification opens to event
- Offline caching of calendar data
- Export to device calendar (with sync options)

**Dependencies:**
- Tenant/branch configuration (for term dates, holidays)
- User role and group visibility system
- Notification system
- Resource management (rooms/equipment for event locations)
- Existing academic events foundation (enhancing what's already started)

**Estimated Effort:** 2.5 days

---

### 8. Social Media Post Scheduling
*Automated posting of school announcements to social platforms*

**Backend Tasks:**
- [ ] Create `social_posts` table (id, content, platform, scheduledTime, status, createdBy, publishedAt, engagementMetrics)
- [ ] Create `social_accounts` table (institutionId, platform, credentialsEncrypted, pageId, isActive)
- Implement social media API in `src/routes/social.ts`:
  - POST `/social/posts` (create/schedule post)
  - GET `/social/posts` (list with filters: status, date range)
  - GET `/social/posts/:id` (get post details + analytics)
  - PUT `/social/posts/:id` (reschedule/update)
  - DELETE `/social/posts/:id` (cancel scheduled post)
  - POST `/social/posts/:id/publish-now` (immediate publish)
  - GET `/social/accounts` (connected accounts)
  - POST `/social/accounts` (connect new account)
  - DELETE `/social/accounts/:id` (disconnect)
- Implement platform integrations:
  - Facebook Graph API (for pages)
  - Twitter API v2 (for tweets)
  - Instagram Basic Display API (limited posting)
  - LinkedIn API (for company updates)
  - Note: Start with Facebook as primary (most common for schools)
- Create credential encryption/decryption service (using environment-based keys)
- Build scheduling service:
  - Store scheduled posts in database
  - Worker process to check and publish at scheduled times
  - Handle timezones correctly (store in UTC, convert for display)
- Add posting logic:
  - Format content per platform (character limits, hashtags, image specs)
  - Attach media (images, videos) according to platform requirements
  - Handle link shortening (bit.ly or similar)
  - Add UTM parameters for tracking
- Implement approval workflow:
  - Draft → Pending Review → Scheduled → Published → Archived
  - Role-based permissions (who can create, approve, publish)
- Add analytics collection:
  - Fetch engagement metrics (likes, shares, comments, reach)
  - Store in database for reporting
  - Generate weekly/monthly performance reports
- Error handling:
  - Retry failed posts (exponential backoff)
  - Dead letter queue for permanently failed posts
  - Alerts for authentication token expiration
- Add content library:
  - Reusable templates (event announcements, achievement shares)
  - Media asset gallery (school photos, logos)
  - Hashtag suggestions based on content
- Extend `test-tms.ts` for social media workflows

**Frontend Web Tasks:**
- Social Media Dashboard:
  - Connected accounts overview (status: connected, needs reauth)
  - Content calendar (view scheduled posts)
  - Create new post form
  - Analytics/reports section
- Post Composer:
  - Rich text editor (with basic formatting)
  - Character counter (with platform-specific limits)
  - Media uploader (image/video with preview)
  - Hashtag suggestions (auto-complete based on topic)
  - Preview pane (show how it will look on each platform)
  - Schedule picker (date/time selector with timezone)
  - Save as Draft / Request Review / Schedule Now buttons
- Approval Workflow UI:
  - Pending review queue (for approvers)
  - Comment/discussion thread on posts
  - Approve/Request Changes/Publish actions
- Content Library:
  - Template gallery (save/reuse successful formats)
  - Media browser (upload, organize, reuse assets)
  - Asset editing basics (crop, resize)
- Analytics Views:
  - Engagement over time (line chart)
  - Top performing posts (by platform)
  - Audience demographics (if available from APIs)
  - Posting frequency heatmap
- Integration Points:
  - Announcement system: "Share to Social" button on announcements
  - Achievement system: "Share Student Success" one-click
  - Event promotion: "Add to Social Calendar" when creating events
  - Newsletter integration: repurpose content for social
- Features:
  - UTM parameter builder
  - Link shortener integration
  - Emoji picker
  - Hashtag analytics (track which tags perform best)
  - Post recycling (reschedule top-performing content)
- Responsiveness:
  - Full-featured desktop interface
  - Simplified mobile view for quick posting/approval

**Mobile Tasks:**
- Limited mobile functionality (approvals and quick viewing):
  - Push notifications for content needing approval
  - Simple approve/reject interface
  - View scheduled posts calendar
  - Draft creation for later completion on desktop
- Note: Full content creation better suited for desktop due to complexity

**Dependencies:**
- Authentication system (for social account linking)
- Notification system (for approval requests and publishing confirmations)
- File storage (for media assets)
- External API credentials (to be provided by client per SOW assumptions)
- Rate limiting awareness (to avoid platform restrictions)

**Estimated Effort:** 3.0 days (complex due to external APIs and approval workflows)

---

### 9. HR Management & Staff Performance
*Staff records, leave tracking, performance evaluations, and professional development*

**Backend Tasks:**
- Enhance existing `hr.ts` route (builds on Phase 1 foundation):
  - [ ] Create `employee_records` table (extends users table with: employeeId, hireDate, department, position, salaryGrade, employmentType, emergencyContact)
  - [ ] Create `performance_reviews` table (id, employeeId, reviewerId, periodStart, periodEnd, ratings, comments, goals, nextReviewDate)
  - [ ] Create `training_courses` table (id, title, description, provider, cost, credits, completedBy, completionDate)
  - [ ] Create `training_enrollments` table (employeeId, courseId, enrollmentStatus, completionDate, certificateUrl)
- Implement HR API:
  - Employee profile management (CRUD for extended employee data)
  - Performance review cycles:
    - Schedule review periods (quarterly, bi-annual, annual)
    - Template-based evaluations (competency ratings, goal tracking)
    - Self-assessment + manager review + HR review stages
    - Development plan generation from review outcomes
  - Training & development:
    - Course catalog management
    - Enrollment/waitlisting
    - Completion tracking
    - Certification expiry alerts
  - Compensation tracking:
    - Salary history
    - Bonus/commission tracking
    - Equity/stock award tracking (if applicable)
  - Exit management:
    - Resignation processing
    - Exit interview scheduling
    - Knowledge transfer checklist
- Integrate with existing leave system:
  - Leave balance accrual (based on tenure/employment type)
  - Leave forecasting (project future balances)
  - Leave payout calculation (for termination)
- Add HR analytics endpoints:
  - Headcount by department/role
  - Turnover rates (voluntary/involuntary)
  - Average tenure
  - Training completion rates
  - Performance score distributions
- Implement document management:
  - Secure storage for contracts, certifications, disciplinary records
  - Access controls (HR only vs manager vs employee)
  - Expiration tracking (work visas, certifications, licenses)
- Create HR dashboard widgets:
  - Upcoming work anniversaries
  - Pending performance reviews
  - Training expiring soon
  - Open positions
- Extend `test-tms.ts` for HR scenarios

**Frontend Web Tasks:**
- Employee Directory:
  - Searchable/filterable list of all staff
  - Detailed profile cards (with role, department, contact info)
  - Export to CSV/PDF
- Employee Profile View:
  - Tabs: Personal Info, Employment History, Performance, Training, Documents
  - Editable sections (with appropriate permissions)
  - Timeline view of employment events
- Performance Review Module:
  - Review initiation workflow (scheduled or ad-hoc)
  - Interactive evaluation form (with rubric/sliders)
  - Goal setting and tracking (SMART goals framework)
  - Feedback collection (peer, self, manager)
  - Development plan builder
  - Historical review comparison
- Training Management:
  - Course catalog browsing/enrollment
  - My learning path (assigned/recommended/completed)
  - Certificate wallet (view/download earned credentials)
  - Skill tracking (self-assessed proficiency over time)
- Time Off Integration:
  - Enhanced leave balance view (with projected accrual)
  - Leave request history with approval chain
  - Team calendar view (who's out when)
- HR Dashboard (for HR managers/HRBP):
  - Workforce demographics (age, gender, tenure distribution)
  - Hiring pipeline metrics
  - Retention risk indicators
  - Compliance dashboard (expiring docs, overdue reviews)
- Communication Features:
  - Work anniversary/birthday announcements (automated)
  - Promotion/transfer notifications
  - Training opportunity announcements
- Mobile Considerations:
  - HR staff: Approve time off requests on mobile
  - Employees: View payslips, request time off, enroll in training
  - Managers: Review team time off, approve swaps, give quick feedback

**Dependencies:**
- User authentication system (extended for employee vs contractor distinctions)
- Leave system (from Phase 1 - to enhance and integrate)
- Notification system (for HR workflows)
- File storage (for document management)
- Potential payroll integration foundation (for Phase 3)
- Reporting/dashboard framework (extend existing patterns)

**Estimated Effort:** 3.5 days

---

### 10. AI Financial Estimation Engine
*Foundational intelligence for expense forecasting and budget recommendations*

**Backend Tasks:**
- Create `financial_insights` table (id, type, entityId, period, prediction, confidence, factors, generatedAt, expiresAt)
- Create `expense_categories` table (standardized chart of accounts for schools)
- Implement AI service layer:
  - Data preparation pipeline:
    - Extract historical financial data (from finances module)
    - Clean and normalize data (handle missing values, outliers)
    - Feature engineering (seasonality, trends, external factors)
  - Baseline forecasting models:
    - Time series decomposition (trend + seasonality + residual)
    - Exponential smoothing (Holt-Winters for seasonality)
    - Linear regression with seasonal dummies
  - Expense categorization:
    - Rule-based auto-categorization (based on description/vendor)
    - Confidence scoring for predictions
  - Anomaly detection:
    - Flag unusual expenditures for review
    - Learn from user corrections (feedback loop)
  - Budget recommendation engine:
    - Variance analysis (actual vs budget)
    - Zero-based budgeting suggestions
    - Scenario planning (what-if analysis)
- Create API endpoints in `src/routes/finances.ts` (extend existing):
  - GET `/finances/forecast/:expenseType` (get forecast for category)
  - GET `/finances/budget-recommendations` (get suggested budget allocations)
  - POST `/finances/feedback` (user corrections to improve model)
  - GET `/finances/anomalies/:period` (detect unusual spending)
  - GET `/finances/trends/:metric` (get trend analysis)
- Implement data pipeline:
  - Scheduled job to retrain models weekly (using latest month's data)
  - Feature store for consistent model inputs
  - Model versioning and A/B testing framework
- Add explainability features:
  - Show top factors driving each prediction
  - Confidence intervals for forecasts
  - "What changed" analysis vs previous period
- Create financial health indicators:
  - Liquidity ratios (current ratio, quick ratio)
  - Efficiency metrics (expense per student, revenue per teacher)
  - Trend indicators (improving/declining/stable)
- Integrate with existing financial modules:
  - Expense tracking (from finances.ts)
  - Budgeting/planning (enhance existing budget fields)
  - Reporting (add predictive columns to standard reports)
- Security considerations:
  - Ensure financial data isolation between tenants
  - Audit trail for all predictions and recommendations
  - No storage of raw financial data in ML logs
- Extend `test-tms.ts` for financial intelligence scenarios

**Frontend Web Tasks:**
- Financial Dashboard Enhancements:
  - Forecast widgets (next 3/6/12 months for key expenses)
  - Budget vs actual comparison with projections
  - Variance analysis (favorable/unfavorable with drill-down)
  - Scenario planner (adjust assumptions to see impact)
- Expense Intelligence:
  - Auto-categorization review interface (confirm/correct suggestions)
  - Suggested category tags with confidence scores
  - Spend anomaly alerts (unusual spikes/drops)
- Budget Planning Tools:
  - Zero-based budgeting builder (start from zero, justify each item)
  - Rolling forecast editor (adjust future months based on current trends)
  - Driver-based budgeting (link expenses to enrollment/faculty changes)
- Reporting Additions:
  - Forecast vs actual reports
  - Variance explanation reports
  - Rolling forecast statements
- User Interaction:
  - Feedback mechanism on predictions (thumbs up/down with comments)
  - Override capability (manual adjustment with reasoning)
  - "Explain this prediction" button (show contributing factors)
- Visualization Components:
  - Forecast cones (showing prediction uncertainty ranges)
  - Waterfall charts (for variance analysis)
  - Sparkline trends in table cells
  - Gauge charts for KPI progress toward targets
- Integration Points:
  - Enhance existing expense reports with forecasting column
  - Add "AI Suggestion" badges in budgeting forms
  - Include predictive insights in financial committee reports
  - Export forecasts to Excel/CSV for external planning
- Accessibility:
  - Screen reader friendly chart descriptions
  - Color-blind safe palettes for financial charts
  - Keyboard navigable forecasting tools

**Mobile Tasks:**
- Limited mobile views for executives/admins:
  - Forecast snapshot (key metrics on home screen)
  - Alert notifications for significant forecast changes
  - Approve/reject budget adjustment suggestions
  - View variance alerts with drill-down capability
- Note: Full modeling/editing better suited for desktop due to complexity

**Dependencies:**
- Financial transactions module (from Phase 1 - expenses, invoices, payments)
- Budgeting/planning foundation (existing basic budget fields)
- Data warehousing/ETL capabilities (for historical data aggregation)
- Statistical/mathematical libraries (consider integrating science-js or similar)
- Explainable AI techniques (SHAP values or similar for transparency)
- Forecast validation framework (backtesting against historical data)
- Important: This is foundational AI/ML - not full predictive analytics yet

**Estimated Effort:** 3.5 days (most complex due to data science components)

---

## Cross-Cutting Technical Tasks

### Infrastructure & DevOps
- [ ] Set up feature flag system (for gradual rollout of Phase 2 features)
- [ ] Enhance CI/CD pipeline to include new service tests
- [ ] Add performance benchmarking for new endpoints
- [ ] Implement request/response logging for audit trails
- [ ] Add rate limiting to prevent API abuse
- [ ] Set up error tracking and alerting (Sentry or similar)
- [ ] Create database migration scripts for all new tables
- [ ] Add backup verification procedures
- [ ] Implement API versioning strategy (for future compatibility)
- [ ] Create Docker/compose updates for new services
- [ ] Add health check endpoints for new features
- [ ] Implement data retention policies (for logs, temporary files)
- [ ] Set up staging environment for UAT preparation

### Testing & Quality Assurance
- [ ] Write unit tests for all new services and utilities
- [ ] Write integration tests for API endpoints
- [ ] Expand `test-tms.ts` to cover all Phase 2 workflows
- [ ] Add end-to-end testing scenarios (Cypress or Playwright)
- [ ] Perform security review:
  - Input validation and sanitization
  - Authentication/authorization checks
  - Data exposure prevention
  - CSRF/XSS protection
- [ ] Conduct performance testing:
  - Load testing for new endpoints
  - Database query optimization
  - Caching strategy review (Redis for session/cache?)
- [ ] Perform usability testing:
  - Keyboard navigation verification
  - Screen reader compatibility
  - Color contrast compliance (WCAG AA)
  - Mobile touch target sizes
- [ ] Create test data scripts for consistent QA environments
- [ ] Set up beta testing group (teachers/staff for feedback)

### Documentation & Knowledge Transfer
- [ ] Update API documentation (Swagger/OpenAPI specs)
- [ ] Create user guides for each major feature:
  - Homework Teacher Guide
  - Results Interpretation Guide for Parents
  - Communication Hub Best Practices
  - Appointment Booking Instructions
  - Certificate Generation Process
  - Calendar Management Manual
  - Social Media Compliance Guide
  - HR Procedures Manual
  - Financial Insights Interpretation
- [ ] Create administrator guides:
  - Feature enable/disable procedures
  - Configuration options and defaults
  - Troubleshooting common issues
  - Backup and restore procedures
- [ ] Update technical architecture diagrams
- [ ] Create data dictionary for new tables
- [ ] Develop runbook for common operations:
  - How to trigger homework batch creation
  - How to run financial forecasting job
  - How to export social media analytics
  - How to reset user communication preferences
- [ ] Create video tutorials for complex workflows:
  - Creating and grading homework assignments
  - Setting up performance review cycles
  - Designing and issuing certificates
  - Scheduling and managing social media content
- [ ] Conduct knowledge transfer sessions:
  - Walkthrough of new features for client stakeholders
  - Q&A sessions for power users
  - Train-the-trainer materials for school administrators

## Dependencies & Assumptions

### Critical Dependencies from Phase 1:
1. **Authentication & RBAC** - All features rely on proper role-based access
2. **Multi-tenancy** - Data isolation must be maintained
3. **Notification System** - SMS/Push foundations must be functional
4. **File Storage** - Required for attachments, certificates, media assets
5. **Database Schema** - Clean migrations without downtime
6. **Environment Configuration** - Secrets management for external APIs

### Client-Provided Requirements (Per SOW Assumptions):
1. **Social Media API Credentials** - Facebook, Twitter, etc. access tokens
2. **SMS Gateway Credentials** - For actual message delivery
3. **Firebase Credentials** - For push notifications (though Phase 1 should have this)
4. **Institution Calendar Data** - Term dates, holidays, events for initial load
5. **Staff Hierarchy Definitions** - Reporting structures for HR and approval workflows
6. **Financial Chart of Accounts** - Preferred expense/income categorization scheme

### Technical Assumptions:
1. **Backend**: Node.js v18+, Express, TypeScript, Prisma ORM, PostgreSQL
2. **Frontend Web**: React 19, TypeScript, Webpack, CSS modules
3. **Mobile**: Flutter 3+, Dart, Android/iOS targeting
4. **State Management**: Context API or Zustand (web), Provider or Riverpod (flutter)
5. **Real-time**: Socket.IO for websockets (if implemented)
6. **File Storage**: Local disk or cloud storage (AWS S3 compatible)
7. **AI/ML**: Mathematical/statistical libraries (no external AI service dependencies)
8. **Third-party Integrations**: Standard REST APIs with OAuth2/API keys

## Risk Mitigation

### Technical Risks:
1. **Performance Impact** - Mitigation: Add database indexes early, implement pagination, use caching for frequent queries
2. **Integration Complexity** - Mitigation: Use adapter patterns for external services, implement circuit breakers
3. **Data Privacy** - Mitigation: Row-level security, encryption at rest, regular access audits
4. **Third-party API Changes** - Mitigation: Abstract service layers, version pinning, monitoring for deprecations
5. **Mobile Performance** - Mitigation: Bundle analysis, lazy loading, image optimization, offline-first patterns

### Schedule Risks:
1. **Scope Creep** - Mitigation: Strict adherence to SOW-defined features, use change request process
2. **External Dependency Delays** - Mitigation: Have mock services ready, parallel work on non-dependent features
3. **Testing Bottlenecks** - Mitigation: Automated test coverage, continuous testing, dedicated QA resources
4. **User Adoption** - Mitigation: Involve power users in design, provide training materials, gather feedback early

### Quality Risks:
1. **Inconsistent UX** - Mitigation: Reuse existing components, follow established design system, conduct UI reviews
2. **Technical Debt** - Mitigation: Definition of Done includes code review, unit tests, documentation
3. **Scalability Issues** - Mitigation: Load test critical paths, monitor database queries, implement caching where beneficial
4. **Localization Issues** - Mitigation: Use i18n framework from start, even if only English initially

## Acceptance Criteria (Aligned with SOW-001 Checklist Pattern)

Each feature set must satisfy:
1. **Functional Completeness** - All specified user stories work end-to-end
2. **Role-based Access Control** - Correct permissions enforced at API and UI layers
3. **Data Integrity** - Proper validation, constraints, and error handling
4. **Performance** - Page loads <3s, API responses <200ms for 95% of requests
5. **Usability** - Intuitive workflows, clear error messages, helpful tooltips
6. **Compatibility** - Works in supported browsers (Chrome, Firefox, Safari) and devices
7. **Security** - No OWASP Top 10 vulnerabilities, proper authentication
8. **Observability** - Adequate logging, metrics, and health checks
9. **Documentation** - User/admin documentation completed
10. **Testability** - Unit test coverage >80% for new code, integration tests for critical paths

## Delivery Schedule (Suggested 15-Day Breakdown)

**Week 1 (Days 1-5): Foundation & Core Features**
- Days 1-2: Database migrations, infrastructure setup, feature flags
- Days 3-5: Homework System (backend + frontend + mobile)

**Week 2 (Days 6-10): Communication & Engagement**
- Days 6-7: Communication Hub (backend core + real-time)
- Days 8-9: Communication Hub (frontend/web + mobile)
- Day 10: Academic Calendar (backend)

**Week 3 (Days 11-15): Specialized Systems & Intelligence**
- Day 11: Academic Calendar (frontend/web + mobile)
- Days 12-13: Appointment Booking + Certificate Generation
- Day 14: Results Tracking + Teacher Verification + HR Management
- Day 15: Social Media Scheduling + AI Financial Estimation + Final Testing & Documentation

**Buffer Days**: Build in 1-2 float days for unexpected complexities or dependency delays

---

## Next Steps After Phase 2 Completion

Upon successful acceptance of Phase 2:
1. **Prepare for Phase 3 Kickoff** - Review ERP & Advanced Features requirements
2. **Conduct Retrospective** - Identify process improvements for Phase 3
3. **Address Technical Debt** - Refactor any shortcuts taken during rapid development
4. **Performance Optimization** - Based on real-world usage metrics
5. **Feature Refinement** - Based on user feedback from Phase 2 usage
6. **Begin Phase 3 Planning** - Detailed task breakdown for Payroll, Petty Cash, P&L, etc.

---

*This task list provides a granular implementation roadmap for Phase 2 of the TMS project. All estimates are approximate and should be adjusted based on team velocity and specific technical constraints discovered during development.*

*Document generated based on TMS project documentation analysis*
*Last updated: $(date)*