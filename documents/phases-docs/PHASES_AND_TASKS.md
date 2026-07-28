# Tution Management System (TMS) - Phases and Task List

## Overview
This document outlines the phased implementation plan for the Tuition Management System (TMS) based on the project documentation, including:
- Phase 1 Frontend Implementation Plan (from plan.md)
- Phase 1 Backend Scope (from TMS_SOW_001_Phase1.docx)
- Overall 4-phase project structure

## Project Structure Overview
```
tms-monorepo/
├── apps/
│   ├── web/          ← React 19 + TypeScript + Webpack (Frontend Dashboard)
│   └── mobile/       ← Flutter (Mobile Apps for Teacher/Student/Parent)
├── packages/
│   ├── types/        ← Shared TypeScript Type Definitions
│   └── ui-login/     ← Legacy Tailwind UI transactional login template
└── services/
    └── api/          ← Node.js Express Backend API (Complete)
```

---

## Phase 1: Core Foundation (Completed - July 6-20, 2026)
*Based on SOW-001 and plan.md*

### Backend Deliverables (Services/API):
✅ **System Architecture & Infrastructure**
- Cloud infrastructure provisioned
- Multi-tenant PostgreSQL schema with row-level isolation
- React + Node.js project scaffolds initialized
- CI/CD pipeline configured
- All environments (dev/staging/production) live

✅ **Authentication & Role-Based Access Control (RBAC)**
- JWT-based authentication with role-aware login
- 2FA via SMS OTP for admin roles
- Session management and timeout handling
- All 9 roles defined: Super Admin, Tenant Admin, Branch Admin, Teacher, Accountant, Receptionist, Janitor, Student, Parent/Guardian
- Role permissions enforced at API middleware layer
- Post-login role-based redirection
- Account lockout after 5 failed attempts

✅ **Tenant & Branch Management**
- Multi-tenant and multi-branch architecture
- Tenant onboarding wizard (5 steps)
- Branch creation, editing, deactivation
- Teacher import between branches
- Multi-branch data isolation (tenant_id scoping)

✅ **Student Enrollment & Management**
- Complete student lifecycle from enrollment to digital ID
- Concurrent enrollment across multiple course types
- Parent/guardian linking with multiple guardian support
- Digital Student ID card generation (PDF)
- Student profile with history, attendance, fee status

✅ **Class & Timetable Management**
- Flexible class creation for all course types
- Weekly timetable builder with conflict detection
- Role-based timetable views (Admin, Teacher, Student, Parent)
- Personalized class creation (Branch Admin only)

✅ **Geo-Attendance System (Teacher + Student)**
- Teacher mobile app GPS validation (20m radius)
- Mark IN/OUT with auto-departure detection
- Grace period handling
- Session status tracking (Confirmed, Update Pending, Partial, Unscheduled, Absent)
- Student attendance taken by teacher from class roster

✅ **Financial & Billing Engine**
- Fee definitions and pro-rated billing
- Combined and per-course invoice generation
- Nepal Pay QR code generation (unique per invoice)
- VAT/PAN display on invoices
- Monthly due verification cron
- Student blocking for overdue payments
- Admin override with audit logging

✅ **Dashboard & Reporting**
- Role-scoped dashboards (Tenant Admin, Branch Admin, Teacher, Student, Parent)
- Real-time data refresh (5-minute polling)
- KPI cards with skeleton loaders and animated transitions
- Progress rings and comparison bars with SVG animations
- Role-based data isolation (no cross-tenant/role visibility)

✅ **Digital Student ID & Lifetime Record**
- Permanent student identity with configurable ID format
- Digital ID card PDF generation (photo, name, ID, grade, branch, year)
- Append-only lifetime record (no historical deletion)
- Tenant/Branch admin access to full history
- Student/Parent access to current year only

✅ **Leave & Early Out System**
- Staff leave request (Casual/Sick/Long Sick)
- Student advance leave (parent-initiated)
- Student emergency early out (Branch Admin logged)
- Leave calendars and balance tracking
- Excused absence tracking with badges
- Notification integration for approvals/emergencies

✅ **SMS & Push Notification Foundation**
- SMS gateway integration (Nepal mobile numbers)
- Firebase Cloud Messaging (FCM) for Android/iOS
- Automated notifications for:
  - Fee invoices and payment confirmations
  - Student blocking due to dues
  - Teacher auto-departure alerts
  - Student emergency early out
  - Monthly due verification reminders
- Notification preference settings

### Frontend Deliverables (Web Apps):
✅ **Design System & Tokens**
- Brand colors: Primary (#0F4C8A), Accent (#F39C12), etc.
- Status colors: Success (#2E9E5B), Warning (#E08E00), Error (#D64545), Info (#1B5FA7)
- Typography: Fraunces (display), Roboto (UI)
- Spacing scale, radius/elevation, responsive breakpoints

✅ **Authentication Screens**
- Login (split-screen desktop, single-col mobile)
- Forgot Password + OTP verification
- Reset Password with strength validation
- Two-Factor Authentication (admin roles)
- Role-based post-login redirection

✅ **Role-Specific Dashboards**
- Tenant Admin: Multi-branch overview, financial summary, alerts
- Branch Admin: Today's attendance, timetable, fee billing
- Teacher: Today's classes, attendance marking, daily updates
- Student: Timetable, fee status, announcements, digital ID
- Parent: Child switcher, attendance, fee balance, timetable

✅ **Shared Dashboard Components**
- KPI cards with MoM deltas and progress bars
- SVG-animated progress rings and comparison bars
- Shimmer skeletons on load
- Role-isolated navigation (no shared admin surface)

✅ **Navigation Structure by Role**
- Role-specific sidebar items with phase tags (Phase 2/3 disabled)
- Consistent main/academic/finance/operations/communication/settings structure
- Mobile bottom navigation (4 tabs max) for Flutter apps

✅ **Flutter Mobile App**
- Teacher geo-attendance with large MARK IN/OUT button
- Parent child switcher (horizontal chip row)
- Student fee status and digital ID access
- Same auth screens as web (OTP, reset, 2FA)
- Low-bandwidth optimization, 48dp+ tap targets

---

## Phase 2: Academic & Operations (Planned - July 21-August 4, 2026)
*From SOW-001 outline*

### Planned Deliverables:
- **Homework Management**: Creation, distribution, submission tracking
- **Results & Academic Performance**: Exam/assignment recording, report cards
- **Teacher Daily Verification**: Mandatory logout gate for end-of-day confirmation
- **Communication Hub**: Threaded messaging between stakeholders
- **Appointment Booking**: Parent-teacher meetings, consultations
- **Certificate Generation**: Course completion, achievement certificates
- **Academic Calendar**: Term dates, holidays, exam schedules
- **Social Media Post Scheduling**: Automated school announcements
- **HR Management**: Staff performance scoring, attendance tracking
- **AI Financial Estimation**: Expense suggestions, budget forecasting

### Technical Components:
- Extended API endpoints for homework/results
- File upload/storage for assignment submissions
- Real-time messaging infrastructure (WebSocket/similar)
- Calendar integration and scheduling algorithms
- Template-based certificate generation (PDF)
- Social media API integrations (Facebook, Instagram)
- HR evaluation workflows and reporting
- Machine learning models for financial prediction

---

## Phase 3: ERP & Advanced Features (Planned - August 5-19, 2026)
*From SOW-001 outline*

### Planned Deliverables:
- **Full ERP Expense Management**: Complete expenditure tracking
- **Payroll Auto-Calculation**: Salary processing with tax deductions
- **Two-Level Petty Cash Approval**: Accountant → Branch Admin → Tenant Admin workflow
- **P&L Dashboard & Double-Entry Ledger**: Financial reporting and audit trails
- **Short/Long-Term Course Engine**: Flexible course duration management
- **Music Module**: Specialized handling for music courses/instruments
- **Refund Management**: Pro-rata calculations: Pro-rata refund calculations based on withdrawal timing
- **Full Cron Automation**: Comprehensive scheduled task system for all operations

### Technical Components:
- Advanced financial transaction processing
- Automated tax calculation and reporting
- Approval workflow engines with notifications
- Double-entry accounting implementation
- Course duration and pricing flexibility engines
- Specialized billing rules for music programs
- Refund policy engine with configurable rules
- Enterprise job scheduling system

---

## Phase 4: Handover & QA (Planned - August 20-September 3, 2026)
*From SOW-001 outline*

### Planned Deliverables:
- **Full QA & UAT**: Comprehensive testing across all modules
- **Source Code Delivery**: Complete repository with documentation
- **Documentation Package**: User guides, admin manuals, API docs
- **Deployed Instance Handover**: Production-ready deployment
- **Credentials Transfer**: Secure handover of access credentials
- **Technical Handover Session**: 4-6 hour knowledge transfer

### Key Activities:
- System integration testing
- User acceptance testing with client stakeholders
- Performance and load testing
- Security audit and penetration testing
- Documentation creation and review
- Deployment automation and rollback procedures
- Training materials and knowledge transfer sessions

---

## Current Status & Next Steps

### Completed (Phase 1):
- ✅ Backend API (services/api/) - Fully functional
- ✅ Frontend Web Dashboard (apps/web/) - Complete per plan.md
- ✅ Flutter Mobile Apps (apps/mobile/) - Scaffolded and themed
- ✅ Shared Packages (packages/types/, packages/ui-login/) - Established
- ✅ Database Schema - Multi-tenant PostgreSQL with Prisma
- ✅ Authentication System - JWT, 2FA, role-based redirect
- ✅ Core Modules - All Phase 1 features implemented

### Recommended Immediate Actions:
1. **Review and validate** all Phase 1 deliverables against the SOW-001 checklist
2. **Conduct UAT sessions** with stakeholders using the acceptance criteria
3. **Prepare for Phase 2 kickoff** by reviewing upcoming requirements
4. **Document any technical debt** or improvement opportunities from Phase 1
5. **Set up development environment** for Phase 2 features

### Phase 2 Preparation Checklist:
- [ ] Review homework/results module requirements
- [ ] Plan communication hub architecture (WebSocket vs polling)
- [ ] Design certificate generation templates
- [ ] Define HR performance evaluation framework
- [ ] Research AI/ML options for financial estimation
- [ ] Prepare data migration scripts if needed
- [ ] Set up feature flag system for phased rollouts

---
*Document generated based on TMS project documentation review*
*Last updated: $(date)*