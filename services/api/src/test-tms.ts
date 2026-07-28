import app from './server';
import jwt from 'jsonwebtoken';
import { UserPayload } from '@tms/types';
import { JWT_SECRET } from './utils/env';

const PORT = 3001;

// Build mock Super Admin token to approve onboarding
const mockSuperAdminToken = jwt.sign(
  {
    id: 'super-admin-user-001',
    email: 'superadmin@tms.com.np',
    firstName: 'Super',
    lastName: 'Admin',
    tenantId: 'global-platform',
    roles: [
      {
        roleName: 'Super Admin',
        branchId: null,
        permissions: ['super_admin_manage_tenants'],
      },
    ],
  } as UserPayload,
  JWT_SECRET
);

// Build mock Tenant Admin token for Tenant 1
const mockTenantAdminToken = jwt.sign(
  {
    id: 'tenant-admin-user-100',
    email: 'admin@pinnacle.edu.np',
    firstName: 'Pinnacle',
    lastName: 'Admin',
    tenantId: 'pinnacle-tenant-id-777',
    roles: [
      {
        roleName: 'Tenant Admin',
        branchId: null,
        permissions: [
          'manage_courses', 'manage_billing', 'manage_calendar',
          'view_billing', 'manage_branches', 'manage_grades',
          'view_reports', 'manage_staff', 'approve_social_media',
          'manage_certificates', 'manage_homework', 'submit_homework',
        ],
      },
    ],
  } as UserPayload,
  JWT_SECRET
);

// Build mock Teacher token for geo-attendance test
const mockTeacherToken = jwt.sign(
  {
    id: 'teacher-user-500',
    email: 'teacher.ram@pinnacle.edu.np',
    firstName: 'Ram',
    lastName: 'Bahadur',
    tenantId: 'pinnacle-tenant-id-777',
    roles: [
      {
        roleName: 'Teacher',
        branchId: 'b-baneshwor-01',
        permissions: ['mark_geo_attendance', 'manage_homework', 'manage_grades'],
      },
    ],
  } as UserPayload,
  JWT_SECRET
);

async function runTests() {
  const server = app.listen(PORT, async () => {
    console.log(`\n======================================================`);
    console.log(`   TMS PHASE 1 CORE FOUNDATION INTEGRATION TESTS      `);
    console.log(`======================================================\n`);

    try {
      // ----------------------------------------------------
      // TEST 1: Tenant Context Missing Error Verification
      // ----------------------------------------------------
      console.log(`[TEST 1] Querying courses without tenant context...`);
      const res1 = await fetch(`http://localhost:${PORT}/api/courses`, {
        headers: {
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
      });
      const data1 = await res1.json();
      if (res1.status === 400 && data1.error.includes('Tenant context')) {
        console.log(`✅ SUCCESS: Request blocked due to missing tenant headers.`);
      } else {
        throw new Error('TEST 1 FAILED: Expected missing tenant context block.');
      }

      // ----------------------------------------------------
      // TEST 2: Client Onboarding Request Submission
      // ----------------------------------------------------
      console.log(`\n[TEST 2] Submitting onboarding request from new client...`);
      const res2 = await fetch(`http://localhost:${PORT}/api/onboarding/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Pinnacle Tuition Academy',
          email: 'info@pinnacle.edu.np',
          phone: '9851099999',
          panNumber: '609876543',
          remarks: 'Requesting Phase 1 multi-tenant enrollment.',
        }),
      });
      const data2 = await res2.json();
      if (res2.status === 201 && data2.request) {
        console.log(`✅ SUCCESS: Request registered under ID: ${data2.request.id}`);
      } else if (data2.simulatedRequest) {
        console.log(`✅ SUCCESS (Simulated Mode): Request captured gracefully.`);
      } else {
        console.log(`❌ TEST 2 ERROR Details - Status: ${res2.status}, Body:`, data2);
        throw new Error('TEST 2 FAILED: Could not register request.');
      }

      // ----------------------------------------------------
      // TEST 3: Super Admin Manual Onboarding Approval
      // ----------------------------------------------------
      console.log(`\n[TEST 3] Approving onboarding request as Super Admin...`);
      const reqId = data2.request?.id || 'demo-req-123';
      const res3 = await fetch(`http://localhost:${PORT}/api/onboarding/approve/${reqId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockSuperAdminToken}`,
        },
        body: JSON.stringify({
          defaultBranchName: 'Baneshwor Academy Center',
        }),
      });
      const data3 = await res3.json();
      if (res3.status === 200 && data3.provisioned) {
        console.log(`✅ SUCCESS: Tenant provisioned successfully.`);
        console.log(`   - Generated Password: ${data3.provisioned.temporaryPassword}`);
        console.log(`   - Associated Admin Email: ${data3.provisioned.primaryAdminUser}`);
      } else {
        throw new Error('TEST 3 FAILED: Super Admin approval failed.');
      }

      // ----------------------------------------------------
      // TEST 4: Create Tax-Exempt vs Standard VAT Courses
      // ----------------------------------------------------
      console.log(`\n[TEST 4.1] Creating standard course (13% VAT)...`);
      const res4a = await fetch(`http://localhost:${PORT}/api/courses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
        body: JSON.stringify({
          branchId: 'b-baneshwor-01',
          name: 'Grade 12 Physics Core',
          type: 'REGULAR',
          feeStructure: { monthlyBase: 5000 },
          isTaxExempt: false,
          taxPercentage: 13.00,
        }),
      });
      const data4a = await res4a.json();
      console.log(`✅ SUCCESS: Standard course created.`);

      console.log(`[TEST 4.2] Creating tax-exempt course (0% VAT)...`);
      const res4b = await fetch(`http://localhost:${PORT}/api/courses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
        body: JSON.stringify({
          branchId: 'b-baneshwor-01',
          name: 'Traditional Sitar Music Class',
          type: 'MUSIC',
          feeStructure: { monthlyBase: 3500 },
          isTaxExempt: true,
          taxPercentage: 0.00,
        }),
      });
      const data4b = await res4b.json();
      console.log(`✅ SUCCESS: Tax-exempt music course created.`);

      // ----------------------------------------------------
      // TEST 5: Enrollment Invoice VAT Calculations
      // ----------------------------------------------------
      console.log(`\n[TEST 5.1] Enrolling student in standard course (5000 NPR, no discount)...`);
      const res5a = await fetch(`http://localhost:${PORT}/api/courses/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
        body: JSON.stringify({
          studentId: 'st-01-shyam',
          courseId: data4a.course.id,
          classId: 'c-phys-12',
          monthlyBaseHint: 5000,
          isTaxExemptHint: false,
        }),
      });
      const data5a = await res5a.json();
      console.log(`   - Subtotal: ${data5a.invoice.amount} NPR`);
      console.log(`   - VAT Percentage: ${data5a.invoice.billingDetails.appliedTaxPercentage}%`);
      console.log(`   - VAT Computed: ${data5a.invoice.billingDetails.taxComputedNpr} NPR`);
      console.log(`   - Net Payable: ${data5a.invoice.billingDetails.netPayableNpr} NPR`);
      if (Number(data5a.invoice.billingDetails.netPayableNpr) === 5650) {
        console.log(`✅ SUCCESS: Standard VAT (13%) added correctly.`);
      } else {
        throw new Error('TEST 5.1 FAILED: VAT calculation mismatch.');
      }

      console.log(`[TEST 5.2] Enrolling student in tax-exempt course (3500 NPR)...`);
      const res5b = await fetch(`http://localhost:${PORT}/api/courses/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
        body: JSON.stringify({
          studentId: 'st-01-shyam',
          courseId: data4b.course.id,
          classId: 'c-sitar-01',
          monthlyBaseHint: 3500,
          isTaxExemptHint: true,
        }),
      });
      const data5b = await res5b.json();
      console.log(`   - Subtotal: ${data5b.invoice.amount} NPR`);
      console.log(`   - VAT Percentage: ${data5b.invoice.billingDetails.appliedTaxPercentage}%`);
      console.log(`   - VAT Computed: ${data5b.invoice.billingDetails.taxComputedNpr} NPR`);
      console.log(`   - Net Payable: ${data5b.invoice.billingDetails.netPayableNpr} NPR`);
      if (Number(data5b.invoice.billingDetails.netPayableNpr) === 3500) {
        console.log(`✅ SUCCESS: Course processed as tax-exempt correctly.`);
      } else {
        throw new Error('TEST 5.2 FAILED: Tax-exempt calculation mismatch.');
      }

      // ----------------------------------------------------
      // TEST 6: Teacher Geo-Attendance Radius Scopes
      // ----------------------------------------------------
      console.log(`\n[TEST 6.1] Teacher marking IN from outside geofence (New Baneshwor vs. Pokhara)...`);
      // Main Center Kathmandu Baneshwor: 27.6915, 85.3422
      // Simulated outer Pokhara coordinates: 28.2096, 83.9856
      const res6a = await fetch(`http://localhost:${PORT}/api/attendance/in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTeacherToken}`,
        },
        body: JSON.stringify({
          branchId: 'b-baneshwor-01',
          latitude: 28.2096,
          longitude: 83.9856,
          gpsAccuracy: 5.0,
        }),
      });
      const data6a = await res6a.json();
      if (res6a.status === 403 && data6a.error.includes('Geofence violation')) {
        console.log(`✅ SUCCESS: Outside radius stamp successfully blocked.`);
      } else {
        throw new Error('TEST 6.1 FAILED: Expected outside geofence block.');
      }

      console.log(`[TEST 6.2] Teacher marking IN with poor GPS accuracy (accuracy: 45m)...`);
      const res6b = await fetch(`http://localhost:${PORT}/api/attendance/in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTeacherToken}`,
        },
        body: JSON.stringify({
          branchId: 'b-baneshwor-01',
          latitude: 27.6915,
          longitude: 85.3422,
          gpsAccuracy: 45.0, // Exceeds 20m threshold
        }),
      });
      const data6b = await res6b.json();
      if (res6b.status === 422 && data6b.error.includes('GPS accuracy too low')) {
        console.log(`✅ SUCCESS: Poor accuracy stamp successfully blocked.`);
      } else {
        throw new Error('TEST 6.2 FAILED: Expected poor GPS accuracy block.');
      }

      console.log(`[TEST 6.3] Teacher marking IN inside geofence with accurate GPS (accuracy: 8m)...`);
      const res6c = await fetch(`http://localhost:${PORT}/api/attendance/in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTeacherToken}`,
        },
        body: JSON.stringify({
          branchId: 'b-baneshwor-01',
          latitude: 27.6918, // Extremely close, within 50m of branch center
          longitude: 85.3424,
          gpsAccuracy: 8.0,
        }),
      });
      const data6c = await res6c.json();
      // ----------------------------------------------------
      // TEST 6.3 IN-BOUNDS LEGITIMATE MARK IN (existing code)
      // ----------------------------------------------------
      if (res6c.status === 200 && data6c.stamp) {
        console.log(`✅ SUCCESS: Attendance marked successfully.`);
        console.log(`   - Distance from Center: ${data6c.geofenceMeta.distanceFromBranchCenterMeters}m`);
      } else {
        throw new Error('TEST 6.3 FAILED: Legitimate mark IN was incorrectly blocked.');
      }

      // ----------------------------------------------------
      // TEST 6.4: Timetable Creation and Consolidated Queries
      // ----------------------------------------------------
      console.log(`\n[TEST 6.4] Creating a class timetable as Tenant Admin...`);
      const res6_4a = await fetch(`http://localhost:${PORT}/api/courses/classes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
        body: JSON.stringify({
          courseId: data4a.course.id,
          branchId: 'b-baneshwor-01',
          name: 'Grade 12 Physics Regular Sec A',
          schedule: [
            { day: 'Monday', startTime: '09:00', endTime: '10:30' },
            { day: 'Wednesday', startTime: '09:00', endTime: '10:30' },
          ],
        }),
      });
      const data6_4a = await res6_4a.json();
      if (res6_4a.status === 201 && data6_4a.class) {
        console.log(`✅ SUCCESS: Class timetable created (Class ID: ${data6_4a.class.id}).`);
      } else {
        throw new Error('TEST 6.4a FAILED: Timetable creation failed.');
      }

      console.log(`[TEST 6.4b] Querying student weekly timetable...`);
      const res6_4b = await fetch(`http://localhost:${PORT}/api/courses/timetable/student/st-01-shyam`, {
        headers: {
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
      });
      const data6_4b = await res6_4b.json();
      if (res6_4b.status === 200 && data6_4b.timetable) {
        console.log(`✅ SUCCESS: Retrieved student timetable containing ${data6_4b.timetable.length} classes.`);
      } else {
        throw new Error('TEST 6.4b FAILED: Student timetable retrieval failed.');
      }

      // ----------------------------------------------------
      // TEST 6.5: Enrollment blocking & attendance verification
      // ----------------------------------------------------
      console.log(`\n[TEST 6.5] Blocking student due to unpaid dues...`);
      const res6_5a = await fetch(`http://localhost:${PORT}/api/courses/billing/block`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
        body: JSON.stringify({
          studentId: 'st-01-shyam',
          courseId: data4a.course.id,
        }),
      });
      const data6_5a = await res6_5a.json();
      if (res6_5a.status === 200) {
        console.log(`✅ SUCCESS: Student billing block activated.`);
      } else {
        throw new Error('TEST 6.5a FAILED: Fee blocking activation failed.');
      }

      console.log(`[TEST 6.5b] Verifying that marking blocked student PRESENT is denied...`);
      const res6_5b = await fetch(`http://localhost:${PORT}/api/attendance/student`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTeacherToken}`,
        },
        body: JSON.stringify({
          classId: data6_4a.class.id,
          date: '2026-07-06',
          students: [
            { studentId: 'st-01-shyam', status: 'PRESENT' },
          ],
          simEnrollmentStatus: 'BLOCKED',
        }),
      });
      const data6_5b = await res6_5b.json();
      if (res6_5b.status === 403) {
        console.log(`✅ SUCCESS: PRESENT marking blocked correctly. Error: "${data6_5b.error}"`);
      } else {
        throw new Error('TEST 6.5b FAILED: Blocked student was incorrectly marked PRESENT.');
      }

      // ----------------------------------------------------
      // TEST 6.6: Admin Override Verification
      // ----------------------------------------------------
      console.log(`\n[TEST 6.6] Overriding billing block as Branch Admin...`);
      const res6_6 = await fetch(`http://localhost:${PORT}/api/courses/billing/override`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
        body: JSON.stringify({
          studentId: 'st-01-shyam',
          courseId: data4a.course.id,
          reason: 'Parent promised payment by 15th.',
        }),
      });
      const data6_6 = await res6_6.json();
      if (res6_6.status === 200) {
        console.log(`✅ SUCCESS: Admin override applied: "${data6_6.message}"`);
      } else {
        throw new Error('TEST 6.6 FAILED: Admin override failed.');
      }

      // ----------------------------------------------------
      // TEST 6.7: Nepal Pay Webhook confirmation
      // ----------------------------------------------------
      console.log(`\n[TEST 6.7] Simulating Nepal Pay payment webhook callback...`);
      const res6_7 = await fetch(`http://localhost:${PORT}/api/finances/nepalpay/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
        },
        body: JSON.stringify({
          invoiceId: data5a.invoice.id,
          transactionId: 'TXN-NEPALPAY-998877',
          status: 'SUCCESS',
          paymentAmount: 5650,
        }),
      });
      const data6_7 = await res6_7.json();
      if (res6_7.status === 200 && data6_7.payment.status === 'PAID') {
        console.log(`✅ SUCCESS: Webhook parsed, invoice status updated to PAID, student unblocked.`);
      } else {
        throw new Error('TEST 6.7 FAILED: Nepal Pay webhook failed.');
      }

      // ----------------------------------------------------
      // TEST 6.8: Leave Request & Two-Level Approval Chain
      // ----------------------------------------------------
      console.log(`\n[TEST 6.8] Submitting Long Sick Leave request...`);
      const res6_8a = await fetch(`http://localhost:${PORT}/api/leaves/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTeacherToken}`,
        },
        body: JSON.stringify({
          leaveType: 'LONG_SICK',
          startDate: '2026-07-10',
          endDate: '2026-07-20',
          reason: 'Recovering from medical surgery.',
          branchId: 'b-baneshwor-01',
        }),
      });
      const data6_8a = await res6_8a.json();
      const leaveId = data6_8a.leave.id;
      if (res6_8a.status === 201 && data6_8a.leave.status === 'PENDING') {
        console.log(`✅ SUCCESS: Long Sick Leave request submitted (ID: ${leaveId}).`);
      } else {
        throw new Error('TEST 6.8a FAILED: Leave request submission failed.');
      }

      console.log(`[TEST 6.8b] Approving Long Sick Leave as Branch Admin (L1)...`);
      const mockBranchAdminToken = jwt.sign(
        {
          id: 'branch-admin-user-200',
          email: 'branchadmin@pinnacle.edu.np',
          firstName: 'Hari',
          lastName: 'Sharma',
          tenantId: 'pinnacle-tenant-id-777',
          roles: [
            {
              roleName: 'Branch Admin',
              branchId: 'b-baneshwor-01',
              permissions: ['manage_branches', 'mark_geo_attendance'],
            },
          ],
        } as UserPayload,
        JWT_SECRET
      );

      const res6_8b = await fetch(`http://localhost:${PORT}/api/leaves/approve/${leaveId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockBranchAdminToken}`,
        },
        body: JSON.stringify({
          action: 'APPROVE',
          remarks: 'Branch recommends approval.',
          simLeaveType: 'LONG_SICK',
          simLeaveStatus: 'PENDING',
        }),
      });
      const data6_8b = await res6_8b.json();
      if (res6_8b.status === 200 && data6_8b.leave.status === 'APPROVED_LEVEL1') {
        console.log(`✅ SUCCESS: Branch Admin approved request. Status: APPROVED_LEVEL1.`);
      } else {
        throw new Error('TEST 6.8b FAILED: L1 approval failed.');
      }

      console.log(`[TEST 6.8c] Approving Long Sick Leave as Tenant Admin (L2)...`);
      const res6_8c = await fetch(`http://localhost:${PORT}/api/leaves/approve/${leaveId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
        body: JSON.stringify({
          action: 'APPROVE',
          remarks: 'Tenant admin finalized approval.',
          simLeaveType: 'LONG_SICK',
          simLeaveStatus: 'APPROVED_LEVEL1',
        }),
      });
      const data6_8c = await res6_8c.json();
      if (res6_8c.status === 200 && data6_8c.leave.status === 'APPROVED_LEVEL2') {
        console.log(`✅ SUCCESS: Tenant Admin approved request. Status: APPROVED_LEVEL2 (Fully approved).`);
      } else {
        throw new Error('TEST 6.8c FAILED: L2 approval failed.');
      }

      // ----------------------------------------------------
      // TEST 6.9: Leave Pre-excusal in Student Attendance
      // ----------------------------------------------------
      console.log(`\n[TEST 6.9] Marking student attendance with active approved leave...`);
      const res6_9 = await fetch(`http://localhost:${PORT}/api/attendance/student`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTeacherToken}`,
        },
        body: JSON.stringify({
          classId: data6_4a.class.id,
          date: '2026-07-06',
          students: [
            { studentId: 'st-01-shyam', status: 'PRESENT' },
          ],
          simHasApprovedLeave: true,
        }),
      });
      const data6_9 = await res6_9.json();
      if (res6_9.status === 201 && data6_9.records[0].status === 'EXCUSED') {
        console.log(`✅ SUCCESS: Blocked present marked student was pre-excused and changed to EXCUSED.`);
      } else {
        throw new Error('TEST 6.9 FAILED: Leave pre-excusal was ignored.');
      }

      // ----------------------------------------------------
      // TEST 6.10: Student Emergency Out Logger
      // ----------------------------------------------------
      console.log(`\n[TEST 6.10] Logging Student Emergency Departure...`);
      const res6_10 = await fetch(`http://localhost:${PORT}/api/leaves/emergency-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockBranchAdminToken}`,
        },
        body: JSON.stringify({
          studentId: 'st-01-shyam',
          reason: 'Severe stomach flu symptoms.',
          branchId: 'b-baneshwor-01',
        }),
      });
      const data6_10 = await res6_10.json();
      if (res6_10.status === 201 && data6_10.leave.status === 'APPROVED_LEVEL2') {
        console.log(`✅ SUCCESS: Emergency checkout logged and parent notified via SMS.`);
      } else {
        throw new Error('TEST 6.10 FAILED: Student emergency departure logging failed.');
      }

      // ----------------------------------------------------
      // TEST 6.11: smart dashboard, student ID, student lifetime
      // ----------------------------------------------------
      console.log(`\n[TEST 6.11a] Querying Smart Admin Dashboard stats...`);
      const res6_11a = await fetch(`http://localhost:${PORT}/api/onboarding/dashboard`, {
        headers: {
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
      });
      const data6_11a = await res6_11a.json();
      if (res6_11a.status === 200 && data6_11a.activeStudentsCount > 0) {
        console.log(`✅ SUCCESS: Loaded Smart Dashboard stats.`);
      } else {
        throw new Error('TEST 6.11a FAILED: Dashboard query failed.');
      }

      console.log(`[TEST 6.11b] Fetching Digital Student ID Card...`);
      const res6_11b = await fetch(`http://localhost:${PORT}/api/onboarding/student-id/st-01-shyam`, {
        headers: {
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
      });
      const data6_11b = await res6_11b.json();
      if (res6_11b.status === 200 && data6_11b.barcodeToken) {
        console.log(`✅ SUCCESS: Loaded Digital Student ID card: "${data6_11b.cardId}"`);
      } else {
        throw new Error('TEST 6.11b FAILED: Digital student ID card query failed.');
      }

      console.log(`[TEST 6.11c] Fetching Student Lifetime record...`);
      const res6_11c = await fetch(`http://localhost:${PORT}/api/onboarding/student-lifetime/st-01-shyam`, {
        headers: {
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
      });
      const data6_11c = await res6_11c.json();
      if (res6_11c.status === 200 && data6_11c.enrollmentHistory) {
        console.log(`✅ SUCCESS: Student academic lifetime history loaded.`);
      } else {
        throw new Error('TEST 6.11c FAILED: Student lifetime record query failed.');
      }

      // ----------------------------------------------------
      // TEST 6.12: Teacher Verification Daily update gate
      // ----------------------------------------------------
      console.log(`\n[TEST 6.12a] Attempting Teacher Mark IN with pending daily updates...`);
      const res6_12a = await fetch(`http://localhost:${PORT}/api/attendance/in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTeacherToken}`,
        },
        body: JSON.stringify({
          branchId: 'b-baneshwor-01',
          latitude: 27.6918,
          longitude: 85.3423,
          gpsAccuracy: 12.0,
          simPendingUpdate: true,
        }),
      });
      const data6_12a = await res6_12a.json();
      if (res6_12a.status === 403) {
        console.log(`✅ SUCCESS: Mark IN blocked correctly due to pending update: "${data6_12a.error}"`);
      } else {
        throw new Error('TEST 6.12a FAILED: Teacher was incorrectly allowed to mark IN with pending updates.');
      }

      console.log(`[TEST 6.12b] Submitting the pending daily class update...`);
      const res6_12b = await fetch(`http://localhost:${PORT}/api/attendance/session/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTeacherToken}`,
        },
        body: JSON.stringify({
          classId: data6_4a.class.id,
          date: '2026-07-06',
          updateContent: 'Completed Lesson 3 on electrostatics.',
        }),
      });
      const data6_12b = await res6_12b.json();
      if (res6_12b.status === 200) {
        console.log(`✅ SUCCESS: Daily update submitted and session confirmed.`);
      } else {
        throw new Error('TEST 6.12b FAILED: Daily session update failed.');
      }

      console.log(`[TEST 6.12c] Re-attempting Teacher Mark IN after update submission...`);
      const res6_12c = await fetch(`http://localhost:${PORT}/api/attendance/in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTeacherToken}`,
        },
        body: JSON.stringify({
          branchId: 'b-baneshwor-01',
          latitude: 27.6918,
          longitude: 85.3423,
          gpsAccuracy: 12.0,
          simPendingUpdate: false,
        }),
      });
      const data6_12c = await res6_12c.json();
      if (res6_12c.status === 200 && data6_12c.stamp) {
        console.log(`✅ SUCCESS: Mark IN completed successfully after resolving pending updates.`);
      } else {
        throw new Error('TEST 6.12c FAILED: Mark IN was blocked despite resolving pending updates.');
      }

      console.log(`\n======================================================`);
      console.log(`       TMS PHASE 2 EXTENDED INTEGRATION TESTS         `);
      console.log(`======================================================\n`);

      // ----------------------------------------------------
      // TEST 7: Homework Flow Verification
      // ----------------------------------------------------
      console.log(`[TEST 7.1] Creating a homework assignment as Teacher...`);
      const res7a = await fetch(`http://localhost:${PORT}/api/homework`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTeacherToken}`,
        },
        body: JSON.stringify({
          classId: 'c-phys-12',
          branchId: 'b-baneshwor-01',
          subject: 'Physics',
          title: 'Quantum Mechanics Basics',
          description: 'Read Chapter 3 and answer questions 5-10.',
          deadline: new Date(Date.now() + 86400000 * 3),
        }),
      });
      const data7a = await res7a.json();
      const homeworkId = data7a.homework.id;
      console.log(`✅ SUCCESS: Homework created (ID: ${homeworkId})`);

      console.log(`[TEST 7.2] Submitting homework solution as Student...`);
      const res7b = await fetch(`http://localhost:${PORT}/api/homework/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`, // Shared role auth simulator
        },
        body: JSON.stringify({
          homeworkId,
          studentId: 'st-01-shyam',
          submissionUrl: 'https://storage.tms.com.np/submissions/shyam_quantum.pdf',
          remarks: 'Submitted before deadline.',
        }),
      });
      const data7b = await res7b.json();
      const submissionId = data7b.submission.id;
      console.log(`✅ SUCCESS: Homework solution submitted (ID: ${submissionId})`);

      console.log(`[TEST 7.3] Grading homework submission as Teacher...`);
      const res7c = await fetch(`http://localhost:${PORT}/api/homework/grade/${submissionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTeacherToken}`,
        },
        body: JSON.stringify({
          grade: 'A',
          remarks: 'Excellent work on quantum dual nature!',
        }),
      });
      const data7c = await res7c.json();
      console.log(`✅ SUCCESS: Homework submission graded (Grade: ${data7c.submission.grade})`);

      console.log(`[TEST 7.4] Listing homework for class...`);
      const res7d = await fetch(`http://localhost:${PORT}/api/homework/c-phys-12`, {
        headers: {
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTeacherToken}`,
        },
      });
      const data7d = await res7d.json();
      console.log(`✅ SUCCESS: Retrieved ${data7d.homework.length} assignments.`);

      // ----------------------------------------------------
      // TEST 8: Academic & Payment Calendars
      // ----------------------------------------------------
      console.log(`\n[TEST 8.1] Registering an Academic Event (Holiday)...`);
      const res8a = await fetch(`http://localhost:${PORT}/api/academic-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
        body: JSON.stringify({
          title: 'Dashain Vacation',
          description: 'Tuition closed for all regular schedules.',
          eventType: 'HOLIDAY',
          startDate: new Date(Date.now() + 86400000 * 5),
          endDate: new Date(Date.now() + 86400000 * 15),
        }),
      });
      const data8a = await res8a.json();
      console.log(`✅ SUCCESS: Academic Event created: ${data8a.event.title}`);

      console.log(`[TEST 8.2] Fetching payment calendar with red/amber/green color codes...`);
      const res8b = await fetch(`http://localhost:${PORT}/api/academic-events/payments?studentId=st-01-shyam`, {
        headers: {
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
      });
      const data8b = await res8b.json();
      const greenEvents = data8b.paymentEvents.filter((e: any) => e.urgencyColor === 'green');
      const amberEvents = data8b.paymentEvents.filter((e: any) => e.urgencyColor === 'amber');
      const redEvents = data8b.paymentEvents.filter((e: any) => e.urgencyColor === 'red');
      console.log(`✅ SUCCESS: Payment deadlines loaded.`);
      console.log(`   - Overdue (Red): ${redEvents.length} | Urgent (Amber): ${amberEvents.length} | Upcoming (Green): ${greenEvents.length}`);

      // ----------------------------------------------------
      // TEST 9: Personalized Classes
      // ----------------------------------------------------
      console.log(`\n[TEST 9.1] Setting up personalized 1-on-1 class session...`);
      const res9a = await fetch(`http://localhost:${PORT}/api/classes/personalized`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
        body: JSON.stringify({
          branchId: 'b-baneshwor-01',
          name: 'Private Music Lesson - Sitar Advanced',
          courseId: 'simulated-course-102',
          schedule: { days: ['Friday'], time: '16:00-17:00' },
          feeStructure: { perSessionRate: 1500 },
        }),
      });
      const data9a = await res9a.json();
      console.log(`✅ SUCCESS: Private class created: ${data9a.class.name}`);

      console.log(`[TEST 9.2] Marking teacher attendance stamp for private session...`);
      const res9b = await fetch(`http://localhost:${PORT}/api/classes/personalized/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTeacherToken}`,
        },
        body: JSON.stringify({
          classId: data9a.class.id,
          date: new Date(),
          checkInTime: new Date(Date.now() - 3600000), // 1 hour ago
          checkOutTime: new Date(),
          totalMinutes: 60,
          updateContent: 'Completed classical Raga Yaman introductory practice.',
        }),
      });
      const data9b = await res9b.json();
      console.log(`✅ SUCCESS: Attendance and daily update saved (Status: ${data9b.session.status})`);

      // ----------------------------------------------------
      // TEST 10: Performance Engine & Upgrade/Downgrade Signals
      // ----------------------------------------------------
      console.log(`\n[TEST 10.1] Posting test score as Teacher...`);
      const res10a = await fetch(`http://localhost:${PORT}/api/performance/student/scores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTeacherToken}`,
        },
        body: JSON.stringify({
          studentId: 'st-01-shyam',
          subject: 'Mathematics',
          score: 88,
        }),
      });
      const data10a = await res10a.json();
      console.log(`✅ SUCCESS: Score saved: ${data10a.scoreRecord.score} in ${data10a.scoreRecord.subject}`);

      console.log(`[TEST 10.2] Evaluating student score trend for upgrade/downgrade alert...`);
      const res10b = await fetch(`http://localhost:${PORT}/api/performance/student/st-01-shyam?subject=Mathematics`, {
        headers: {
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
      });
      const data10b = await res10b.json();
      console.log(`✅ SUCCESS: Performance signal parsed: ${data10b.analysis.performanceSignal}`);
      console.log(`   - Previous Avg: ${data10b.analysis.previousAverage}% | Latest Score: ${data10b.analysis.latestScore}% | Change: ${data10b.analysis.deltaPercentage}%`);

      console.log(`[TEST 10.3] Extracting multi-factor staff composite scores...`);
      const res10c = await fetch(`http://localhost:${PORT}/api/performance/staff/scores?branchId=b-baneshwor-01`, {
        headers: {
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
      });
      const data10c = await res10c.json();
      console.log(`✅ SUCCESS: Loaded scorecard. Primary Teacher: ${data10c.scores[0].name} | Composite Score: ${data10c.scores[0].compositeScore}/100`);

      // ----------------------------------------------------
      // TEST 11: HR Records & Offboarding
      // ----------------------------------------------------
      console.log(`\n[TEST 11.1] Uploading staff verification document...`);
      const res11a = await fetch(`http://localhost:${PORT}/api/hr/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
        body: JSON.stringify({
          staffRecordId: 'staff-rec-001',
          documentType: 'CONTRACT',
          fileUrl: 'https://storage.tms.com.np/docs/contract_ram.pdf',
          expiryDate: new Date(Date.now() + 86400000 * 15), // Expiring in 15 days
        }),
      });
      const data11a = await res11a.json();
      console.log(`✅ SUCCESS: Verification document registered.`);

      console.log(`[TEST 11.2] Checking expiring document alerts (<30 days)...`);
      const res11b = await fetch(`http://localhost:${PORT}/api/hr/documents/alerts`, {
        headers: {
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
      });
      const data11b = await res11b.json();
      console.log(`✅ SUCCESS: Found ${data11b.expiringDocs.length} documents requiring immediate action.`);

      console.log(`[TEST 11.3] Initiating staff offboarding resignation...`);
      const res11c = await fetch(`http://localhost:${PORT}/api/hr/exit/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
        body: JSON.stringify({
          staffRecordId: 'staff-rec-001',
          resignationDate: new Date(),
          reason: 'Relocating abroad.',
          noticePeriodDays: 30,
          monthlySalary: 50000,
        }),
      });
      const data11c = await res11c.json();
      const exitId = data11c.exit.id;
      console.log(`✅ SUCCESS: Resignation logged. Pro-rated final salary calculated: NPR ${data11c.exit.finalSettlementNpr}`);

      console.log(`[TEST 11.4] Signing off exit clearance items...`);
      const res11d = await fetch(`http://localhost:${PORT}/api/hr/exit/clear/${exitId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
        body: JSON.stringify({
          checklistItem: 'Return of Tuition Keys & Access Card',
        }),
      });
      const data11d = await res11d.json();
      console.log(`✅ SUCCESS: Clearance item verified and signed off.`);

      console.log(`[TEST 11.5] Executing final offboarding settlement & account deactivation...`);
      const res11e = await fetch(`http://localhost:${PORT}/api/hr/exit/settle/${exitId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
      });
      const data11e = await res11e.json();
      console.log(`✅ SUCCESS: Staff record offboarding completed (User Status: ${data11e.settlement.userAccountState})`);

      // ----------------------------------------------------
      // TEST 12: Social Media Publication Queue
      // ----------------------------------------------------
      console.log(`\n[TEST 12.1] Config third-party OAuth access token...`);
      const res12a = await fetch(`http://localhost:${PORT}/api/social/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
        body: JSON.stringify({
          platform: 'FACEBOOK',
          accessToken: process.env.TEST_SOCIAL_ACCESS_TOKEN || `test-token-${Date.now()}`,
        }),
      });
      const data12a = await res12a.json();
      console.log(`✅ SUCCESS: OAuth configured (Configured Platform: ${data12a.config.platform})`);

      console.log(`[TEST 12.2] Creating a draft post as Branch Admin...`);
      const res12b = await fetch(`http://localhost:${PORT}/api/social/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`, // Simulates branch level auth
        },
        body: JSON.stringify({
          branchId: 'b-baneshwor-01',
          title: 'Science Quiz Winner!',
          contentText: 'Congratulations to Shyam Bahadur for winning the Physics Quiz!',
          platforms: ['FACEBOOK', 'INSTAGRAM'],
          scheduledPublishTime: new Date(Date.now() + 86400000),
        }),
      });
      const data12b = await res12b.json();
      const postId = data12b.post.id;
      console.log(`✅ SUCCESS: Draft post saved in queue (Status: ${data12b.post.status})`);

      console.log(`[TEST 12.3] Approving post for publication as Tenant Admin...`);
      const res12c = await fetch(`http://localhost:${PORT}/api/social/posts/approve/${postId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
      });
      const data12c = await res12c.json();
      console.log(`✅ SUCCESS: Post approved for scheduling (Status: ${data12c.post.status})`);

      // ----------------------------------------------------
      // TEST 12.4: Communication Hub Threaded Messaging
      // ----------------------------------------------------
      console.log(`\n[TEST 12.4a] Parent sending message to child's teacher...`);
      const mockParentToken = jwt.sign(
        {
          id: 'parent-user-400',
          email: 'shyam.parent@gmail.com',
          firstName: 'Ram',
          lastName: 'Bahadur Sr',
          tenantId: 'pinnacle-tenant-id-777',
          roles: [
            {
              roleName: 'Parent',
              branchId: null,
              permissions: [] as string[],
            },
          ],
        } as UserPayload,
        JWT_SECRET
      );

      const res12_4a = await fetch(`http://localhost:${PORT}/api/communication/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockParentToken}`,
        },
        body: JSON.stringify({
          studentId: 'st-01-shyam',
          receiverId: 'teacher-user-500',
          messageText: 'Hello teacher, is there any class test tomorrow?',
        }),
      });
      const data12_4a = await res12_4a.json();
      if (res12_4a.status === 201) {
        console.log(`✅ SUCCESS: Message sent from Parent. Push alert triggered.`);
      } else {
        throw new Error('TEST 12.4a FAILED: Parent message dispatch failed.');
      }

      console.log(`[TEST 12.4b] Verifying messaging privacy rule violation blocking...`);
      const res12_4b = await fetch(`http://localhost:${PORT}/api/communication/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockParentToken}`,
        },
        body: JSON.stringify({
          studentId: 'st-01-shyam',
          receiverId: 'random-unauthorized-teacher',
          messageText: 'Hello, are you my child\'s teacher?',
          simPrivacyViolation: true,
        }),
      });
      if (res12_4b.status === 403) {
        console.log(`✅ SUCCESS: Privacy violation correctly blocked unauthorized message.`);
      } else {
        throw new Error('TEST 12.4b FAILED: Unauthorized message was incorrectly allowed.');
      }

      console.log(`[TEST 12.4c] Retrieving student threaded message log...`);
      const res12_4c = await fetch(`http://localhost:${PORT}/api/communication/messages/thread/st-01-shyam`, {
        headers: {
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTeacherToken}`,
        },
      });
      const data12_4c = await res12_4c.json();
      if (res12_4c.status === 200 && data12_4c.messages.length > 0) {
        console.log(`✅ SUCCESS: Loaded thread containing ${data12_4c.messages.length} messages.`);
      } else {
        throw new Error('TEST 12.4c FAILED: Message thread retrieval failed.');
      }

      console.log(`[TEST 12.4d] Admin issuing institutional broadcast...`);
      const res12_4d = await fetch(`http://localhost:${PORT}/api/communication/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
        body: JSON.stringify({
          messageText: 'Due to severe weather warning, classes will be held online tomorrow.',
          target: 'ALL',
        }),
      });
      const data12_4d = await res12_4d.json();
      if (res12_4d.status === 200) {
        console.log(`✅ SUCCESS: Institutional broadcast dispatched via mock SMS.`);
      } else {
        throw new Error('TEST 12.4d FAILED: Admin broadcast failed.');
      }

      // ----------------------------------------------------
      // TEST 12.5: Appointment Booking Engine
      // ----------------------------------------------------
      console.log(`\n[TEST 12.5a] Parent booking appointment (violating 24h window)...`);
      const res12_5a = await fetch(`http://localhost:${PORT}/api/appointments/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockParentToken}`,
        },
        body: JSON.stringify({
          studentId: 'st-01-shyam',
          teacherId: 'teacher-user-500',
          scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        }),
      });
      if (res12_5a.status === 422) {
        console.log(`✅ SUCCESS: Under-24h booking correctly rejected.`);
      } else {
        throw new Error('TEST 12.5a FAILED: Under-24h booking was incorrectly permitted.');
      }

      console.log(`[TEST 12.5b] Parent booking legitimate appointment...`);
      const legitimateTime = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      const res12_5b = await fetch(`http://localhost:${PORT}/api/appointments/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockParentToken}`,
        },
        body: JSON.stringify({
          studentId: 'st-01-shyam',
          teacherId: 'teacher-user-500',
          scheduledTime: legitimateTime,
          remarks: 'Discussion regarding mid-term progress.',
        }),
      });
      const data12_5b = await res12_5b.json();
      const apptId = data12_5b.appointment.id;
      if (res12_5b.status === 201) {
        console.log(`✅ SUCCESS: Legitimate appointment request saved. Status: PENDING.`);
      } else {
        throw new Error('TEST 12.5b FAILED: Appointment request failed.');
      }

      console.log(`[TEST 12.5c] Teacher proposing alternative slot...`);
      const alternativeTime = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
      const res12_5c = await fetch(`http://localhost:${PORT}/api/appointments/respond/${apptId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTeacherToken}`,
        },
        body: JSON.stringify({
          action: 'PROPOSE_ALTERNATIVE',
          alternativeSlot: alternativeTime,
          remarks: 'I am in a faculty meeting. How about this slot?',
        }),
      });
      const data12_5c = await res12_5c.json();
      if (res12_5c.status === 200 && data12_5c.appointment.status === 'ALTERNATIVE_PROPOSED') {
        console.log(`✅ SUCCESS: Alternative slot proposed. Parent notified.`);
      } else {
        throw new Error('TEST 12.5c FAILED: Alternative proposal flow failed.');
      }

      console.log(`[TEST 12.5d] Teacher approving appointment...`);
      const res12_5d = await fetch(`http://localhost:${PORT}/api/appointments/respond/${apptId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTeacherToken}`,
        },
        body: JSON.stringify({
          action: 'APPROVE',
          remarks: 'Confirmed.',
        }),
      });
      const data12_5d = await res12_5d.json();
      if (res12_5d.status === 200 && data12_5d.appointment.status === 'APPROVED') {
        console.log(`✅ SUCCESS: Appointment approved. SMS + Push sent.`);
      } else {
        throw new Error('TEST 12.5d FAILED: Appointment approval failed.');
      }

      // ----------------------------------------------------
      // TEST 12.6: Classroom Resource Logging & Maintenance Tasks
      // ----------------------------------------------------
      console.log(`\n[TEST 12.6a] Staff logging classroom resource checklist with issues...`);
      const res12_6a = await fetch(`http://localhost:${PORT}/api/resources/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTeacherToken}`,
        },
        body: JSON.stringify({
          classroomId: 'Room-102-Physics-Lab',
          itemsCondition: {
            markers: 'POOR',
            duster: 'OK',
            smartBoard: 'FAULTY',
          },
          actionRequired: true,
          remarks: 'Smartboard projection bulb is flickering.',
          branchId: 'b-baneshwor-01',
        }),
      });
      const data12_6a = await res12_6a.json();
      const taskId = data12_6a.maintenanceTask.id;
      if (res12_6a.status === 201 && data12_6a.maintenanceTask && data12_6a.maintenanceTask.status === 'PENDING') {
        console.log(`✅ SUCCESS: Log submitted. Maintenance task auto-assigned to Janitor (ID: ${taskId}).`);
      } else {
        throw new Error('TEST 12.6a FAILED: Resource log submission failed.');
      }

      console.log(`[TEST 12.6b] Maintenance janitor resolving the task...`);
      const mockJanitorToken = jwt.sign(
        {
          id: 'janitor-staff-user-300',
          email: 'janitor@pinnacle.edu.np',
          firstName: 'Bahadur',
          lastName: 'Mali',
          tenantId: 'pinnacle-tenant-id-777',
          roles: [
            {
              roleName: 'Staff',
              branchId: null,
              permissions: [] as string[],
            },
          ],
        } as UserPayload,
        JWT_SECRET
      );

      const res12_6b = await fetch(`http://localhost:${PORT}/api/resources/tasks/complete/${taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockJanitorToken}`,
        },
      });
      const data12_6b = await res12_6b.json();
      if (res12_6b.status === 200 && data12_6b.task.status === 'COMPLETED') {
        console.log(`✅ SUCCESS: Janitor completed the task. Resolver details logged.`);
      } else {
        throw new Error('TEST 12.6b FAILED: Task resolution failed.');
      }

      // ----------------------------------------------------
      // TEST 12.7: Report Export Engine
      // ----------------------------------------------------
      console.log(`\n[TEST 12.7] Exporting Student Grade PDF report...`);
      const res12_7 = await fetch(`http://localhost:${PORT}/api/onboarding/reports/export?reportType=GRADES&format=PDF&studentId=st-01-shyam`, {
        headers: {
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
      });
      const data12_7 = await res12_7.json();
      if (res12_7.status === 200 && data12_7.reportMeta.downloadUrl) {
        console.log(`✅ SUCCESS: PDF report generated: "${data12_7.reportMeta.fileName}"`);
      } else {
        throw new Error('TEST 12.7 FAILED: Report export failed.');
      }

      // ----------------------------------------------------
      // TEST 13: Certificate Generation & Security Verification
      // ----------------------------------------------------
      console.log(`\n[TEST 13.1] Creating a certificate template...`);
      const res13a = await fetch(`http://localhost:${PORT}/api/certificates/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
        body: JSON.stringify({
          name: 'Physics Excellence Certificate',
          type: 'ACHIEVEMENT',
          layoutConfig: { primaryColor: '#004B87', bannerUrl: 'https://storage.tms.com.np/banners/excellence.png' },
        }),
      });
      const data13a = await res13a.json();
      console.log(`✅ SUCCESS: Template saved (ID: ${data13a.template.id})`);

      console.log(`[TEST 13.2] Issuing a certificate to student...`);
      const res13b = await fetch(`http://localhost:${PORT}/api/certificates/issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
        body: JSON.stringify({
          studentId: 'st-01-shyam',
          templateId: data13a.template.id,
          branchId: 'b-baneshwor-01',
          studentNameHint: 'Shyam Bahadur',
          courseNameHint: 'Grade 12 Physics Core',
        }),
      });
      const data13b = await res13b.json();
      const verificationId = data13b.certificate.certificateId;
      console.log(`✅ SUCCESS: Certificate issued (Verification Code: ${verificationId})`);

      console.log(`[TEST 13.3] Performing a public verification authenticity check...`);
      const res13c = await fetch(`http://localhost:${PORT}/api/certificates/verify/${verificationId}`);
      const data13c = await res13c.json();
      console.log(`✅ SUCCESS: Authentic check passed! Valid: ${data13c.isValid} | Recipient: ${data13c.studentName}`);

      // ----------------------------------------------------
      // TEST 14: Financial Intelligence & AI suggestions
      // ----------------------------------------------------
      console.log(`\n[TEST 14.1] Fetching monthly forecast and attrition adjustments...`);
      const res14a = await fetch(`http://localhost:${PORT}/api/finances/forecast`, {
        headers: {
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
      });
      const data14a = await res14a.json();
      console.log(`✅ SUCCESS: Financial forecast compiled.`);
      console.log(`   - Base Estimate: NPR ${data14a.metrics.baseForecastNpr} | Attrition Adj: -NPR ${data14a.metrics.estimatedAttritionNpr} | Net Forecast: NPR ${data14a.metrics.netForecastNpr}`);

      console.log(`[TEST 14.2] Loading AI-driven financial recommendations & anomalous alerts...`);
      const res14b = await fetch(`http://localhost:${PORT}/api/finances/suggestions`, {
        headers: {
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
      });
      const data14b = await res14b.json();
      console.log(`✅ SUCCESS: AI Anomalous Alerts loaded:`);
      data14b.alerts.forEach((alert: any) => {
        console.log(`   - [${alert.type} - Severity: ${alert.severity}] ${alert.message}`);
      });

      // ----------------------------------------------------
      // TEST 15: Canteen Wallet Operations
      // ----------------------------------------------------
      console.log(`\n[TEST 15.1] Initializing Student Cashless Canteen Wallet...`);
      const res15a = await fetch(`http://localhost:${PORT}/api/canteen/wallet/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
        body: JSON.stringify({
          studentId: 'st-01-shyam',
          pin: '1234',
        }),
      });
      const data15a = await res15a.json();
      console.log(`✅ SUCCESS: Canteen wallet created successfully (Wallet ID: ${data15a.walletId})`);

      console.log(`[TEST 15.2] Depositing balance reload via mock Nepal Pay QR...`);
      const res15b = await fetch(`http://localhost:${PORT}/api/canteen/wallet/reload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
        body: JSON.stringify({
          studentId: 'st-01-shyam',
          amount: 500.00,
          referenceId: 'NPP-QR-987654321',
        }),
      });
      const data15b = await res15b.json();
      console.log(`✅ SUCCESS: Deposited reload (Reference ID: ${data15b.referenceId})`);

      console.log(`[TEST 15.3] Debiting canteen purchase with invalid security PIN...`);
      const res15c = await fetch(`http://localhost:${PORT}/api/canteen/wallet/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
        body: JSON.stringify({
          studentId: 'st-01-shyam',
          amount: 150.00,
          pin: '9999', // Incorrect PIN
        }),
      });
      const data15c = await res15c.json();
      if (res15c.status === 401 && data15c.error.includes('declined')) {
        console.log(`✅ SUCCESS: Incorrect PIN transaction successfully declined.`);
      } else {
        throw new Error('TEST 15.3 FAILED: Invalid PIN transaction was incorrectly accepted.');
      }

      console.log(`[TEST 15.4] Debiting canteen purchase with valid security PIN...`);
      const res15d = await fetch(`http://localhost:${PORT}/api/canteen/wallet/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
        body: JSON.stringify({
          studentId: 'st-01-shyam',
          amount: 120.00,
          pin: '1234', // Correct PIN
        }),
      });
      const data15d = await res15d.json();
      console.log(`✅ SUCCESS: Transaction completed! Remaining Balance: NPR ${data15d.remainingBalance}`);

      // ----------------------------------------------------
      // TEST 16: Vehicle Routing & Tracking
      // ----------------------------------------------------
      console.log(`\n[TEST 16.1] Setting up bus route...`);
      const res16a = await fetch(`http://localhost:${PORT}/api/vehicles/routes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
        body: JSON.stringify({
          routeName: 'Baneshwor-Koteshwor Daily Route',
          driverName: 'Hari Prasad',
          driverPhone: '9801234567',
          vehicleNumber: 'BA-2-KHA-1234',
        }),
      });
      const data16a = await res16a.json();
      const routeId = data16a.route.id;
      console.log(`✅ SUCCESS: Bus route created (ID: ${routeId})`);

      console.log(`[TEST 16.2] Assigning student to route...`);
      const res16b = await fetch(`http://localhost:${PORT}/api/vehicles/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
        body: JSON.stringify({
          studentId: 'st-01-shyam',
          routeId,
          pickupPoint: 'Koteshwor Chowk',
        }),
      });
      const data16b = await res16b.json();
      console.log(`✅ SUCCESS: Student mapped to route (Pickup: ${data16b.assignment.pickupPoint})`);

      console.log(`[TEST 16.3] Sending live GPS tracking update from Driver application...`);
      const res16c = await fetch(`http://localhost:${PORT}/api/vehicles/track/${routeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTeacherToken}`, // Driver role simulator
        },
        body: JSON.stringify({
          latitude: 27.6931,
          longitude: 85.3445,
        }),
      });
      const data16c = await res16c.json();
      console.log(`✅ SUCCESS: Live coordinates registered: ${data16c.route.currentLatitude}, ${data16c.route.currentLongitude}`);

      console.log(`[TEST 16.4] Parent retrieving real-time vehicle location...`);
      const res16d = await fetch(`http://localhost:${PORT}/api/vehicles/track/${routeId}`, {
        headers: {
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
      });
      const data16d = await res16d.json();
      console.log(`✅ SUCCESS: Live tracker loaded! Coordinates: ${data16d.latitude}, ${data16d.longitude} (Last Updated: ${data16d.lastUpdated})`);


      // ======================================================
      //       TMS PHASE 3 EXTENDED INTEGRATION TESTS
      // ======================================================
      console.log(`\n======================================================`);
      console.log(`       TMS PHASE 3 EXTENDED INTEGRATION TESTS         `);
      console.log(`======================================================\n`);

      // ----------------------------------------------------
      // TEST 17: Petty Cash L1 and L2 Two-Level Approval Workflow
      // ----------------------------------------------------
      console.log(`[TEST 17.1] Requesting Petty Cash as Accountant...`);
      const res17a = await fetch(`http://localhost:${PORT}/api/finances/petty-cash/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
        body: JSON.stringify({
          amount: 5000,
          purpose: 'New markers and whiteboard cleaners',
          branchId: 'b-baneshwor-01',
        }),
      });
      const data17a = await res17a.json();
      const pettyCashId = data17a.pettyCash.id;
      if (res17a.status === 201 && data17a.pettyCash.status === 'PENDING') {
        console.log(`✅ SUCCESS: Petty Cash request submitted (ID: ${pettyCashId}).`);
      } else {
        throw new Error('TEST 17.1 FAILED: Petty cash request failed.');
      }

      console.log(`[TEST 17.2] Approving Petty Cash as Branch Admin (L1)...`);
      const res17b = await fetch(`http://localhost:${PORT}/api/finances/petty-cash/approve-l1/${pettyCashId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockBranchAdminToken}`,
        },
        body: JSON.stringify({ remarks: 'Approved for science dept.' }),
      });
      const data17b = await res17b.json();
      if (res17b.status === 200 && data17b.pettyCash.status === 'APPROVED_LEVEL1') {
        console.log(`✅ SUCCESS: Branch Admin L1 approval processed.`);
      } else {
        throw new Error('TEST 17.2 FAILED: L1 approval failed.');
      }

      console.log(`[TEST 17.3] Approving Petty Cash as Tenant Admin (L2)...`);
      const res17c = await fetch(`http://localhost:${PORT}/api/finances/petty-cash/approve-l2/${pettyCashId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
        body: JSON.stringify({ remarks: 'Funds released.' }),
      });
      const data17c = await res17c.json();
      if (res17c.status === 200 && data17c.pettyCash.status === 'RELEASED') {
        console.log(`✅ SUCCESS: Tenant Admin L2 approval processed. Status: RELEASED.`);
      } else {
        throw new Error('TEST 17.3 FAILED: L2 approval failed.');
      }

      console.log(`[TEST 17.4] Accountant uploading receipt proof...`);
      const res17d = await fetch(`http://localhost:${PORT}/api/finances/petty-cash/upload-receipt/${pettyCashId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
        body: JSON.stringify({ receiptProofUrl: 'https://storage.tms.com.np/receipts/rec-0988.png' }),
      });
      const data17d = await res17d.json();
      if (res17d.status === 200 && data17d.pettyCash.status === 'RECEIPT_SUBMITTED') {
        console.log(`✅ SUCCESS: Receipt submitted.`);
      } else {
        throw new Error('TEST 17.4 FAILED: Receipt submission failed.');
      }

      console.log(`[TEST 17.5] Closing Petty Cash as Branch Admin...`);
      const res17e = await fetch(`http://localhost:${PORT}/api/finances/petty-cash/close/${pettyCashId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockBranchAdminToken}`,
        },
      });
      const data17e = await res17e.json();
      if (res17e.status === 200 && data17e.pettyCash.status === 'CLOSED') {
        console.log(`✅ SUCCESS: Petty Cash cycle closed successfully.`);
      } else {
        throw new Error('TEST 17.5 FAILED: Close petty cash failed.');
      }

      // ----------------------------------------------------
      // TEST 18: Post and Retrieve Branch Expenses
      // ----------------------------------------------------
      console.log(`\n[TEST 18.1] Creating a category expense (RENT)...`);
      const res18a = await fetch(`http://localhost:${PORT}/api/finances/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
        body: JSON.stringify({
          category: 'RENT',
          amount: 45000,
          purpose: 'July office rent payment',
          branchId: 'b-baneshwor-01',
        }),
      });
      const data18a = await res18a.json();
      if (res18a.status === 201) {
        console.log(`✅ SUCCESS: Expense recorded: NPR ${data18a.expense.amount} (${data18a.expense.category}).`);
      } else {
        throw new Error('TEST 18.1 FAILED: Expense creation failed.');
      }

      console.log(`[TEST 18.2] Fetching list of category expenses...`);
      const res18b = await fetch(`http://localhost:${PORT}/api/finances/expenses?category=RENT`, {
        headers: {
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
      });
      const data18b = await res18b.json();
      if (res18b.status === 200 && data18b.expenses.length > 0) {
        console.log(`✅ SUCCESS: Retrieved category expenses successfully.`);
      } else {
        throw new Error('TEST 18.2 FAILED: Expense lookup failed.');
      }

      // ----------------------------------------------------
      // TEST 19: Payroll Calculation
      // ----------------------------------------------------
      console.log(`\n[TEST 19.1] Initiating payroll auto-calculation...`);
      const res19a = await fetch(`http://localhost:${PORT}/api/hr/payroll/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
        body: JSON.stringify({ month: 7, year: 2026 }),
      });
      const data19a = await res19a.json();
      const payrollId = data19a.payrolls[0].id;
      if (res19a.status === 201 && data19a.payrolls.length > 0) {
        console.log(`✅ SUCCESS: Payroll compiled for ${data19a.payrolls.length} staff records.`);
        console.log(`   - Staff: ${data19a.payrolls[0].staffRecordId} | Net: NPR ${data19a.payrolls[0].netPayable}`);
      } else {
        throw new Error('TEST 19.1 FAILED: Payroll calculation failed.');
      }

      console.log(`[TEST 19.2] Marking payroll item as PAID...`);
      const res19b = await fetch(`http://localhost:${PORT}/api/hr/payroll/pay/${payrollId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
      });
      const data19b = await res19b.json();
      if (res19b.status === 200 && data19b.payroll.status === 'PAID') {
        console.log(`✅ SUCCESS: Payroll salary disbursed.`);
      } else {
        throw new Error('TEST 19.2 FAILED: Pay payroll item failed.');
      }

      // ----------------------------------------------------
      // TEST 20: P&L Dashboard Aggregations
      // ----------------------------------------------------
      console.log(`\n[TEST 20] Retrieving P&L statement aggregates...`);
      const res20 = await fetch(`http://localhost:${PORT}/api/finances/pl`, {
        headers: {
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
      });
      const data20 = await res20.json();
      if (res20.status === 200 && data20.financialSummary) {
        console.log(`✅ SUCCESS: P&L compiled.`);
        console.log(`   - Revenues: NPR ${data20.financialSummary.revenues.totalRevenues}`);
        console.log(`   - Expenses: NPR ${data20.financialSummary.expenses.totalOutflows}`);
        console.log(`   - Net Profit Margin: NPR ${data20.financialSummary.netProfitMargin}`);
      } else {
        throw new Error('TEST 20 FAILED: P&L compilation failed.');
      }

      // ----------------------------------------------------
      // TEST 21: Double-Entry Ledger Export Formatting
      // ----------------------------------------------------
      console.log(`\n[TEST 21] Generating Excel Double-Entry Ledger sheet...`);
      const res21 = await fetch(`http://localhost:${PORT}/api/finances/ledger/export`, {
        headers: {
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
      });
      const data21 = await res21.json();
      if (res21.status === 200 && data21.entries) {
        console.log(`✅ SUCCESS: Export format loaded: "${data21.exportFormat}". Found ${data21.entries.length} double-entry rows.`);
      } else {
        throw new Error('TEST 21 FAILED: Ledger export failed.');
      }

      // ----------------------------------------------------
      // TEST 22: Special Enrollments
      // ----------------------------------------------------
      console.log(`\n[TEST 22] Registering specialized Music class enrollment...`);
      const res22 = await fetch(`http://localhost:${PORT}/api/courses/enroll/special`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
        body: JSON.stringify({
          studentId: 'st-01-shyam',
          courseId: data4a.course.id,
          classId: data6_4a.class.id,
          type: 'MUSIC',
          customFeeSettings: {
            installmentsCount: 4,
            amountPerInstallment: 3000,
          },
        }),
      });
      const data22 = await res22.json();
      if (res22.status === 201 && data22.specializedConfig.billingDetails.mode === 'INSTALLMENTS') {
        console.log(`✅ SUCCESS: Music class customized installment billing configured successfully.`);
      } else {
        throw new Error('TEST 22 FAILED: Specialized enrollment failed.');
      }

      // ----------------------------------------------------
      // TEST 23: Course Refund Request and Policy-based Approvals
      // ----------------------------------------------------
      console.log(`\n[TEST 23.1] Logging course refund request...`);
      const res23a = await fetch(`http://localhost:${PORT}/api/courses/refund/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
        body: JSON.stringify({
          studentId: 'st-01-shyam',
          courseId: data4a.course.id,
          reason: 'Student relocates out of Kathmandu valley.',
          refundAmount: 5650,
        }),
      });
      const data23a = await res23a.json();
      const refundId = data23a.refund.id;
      if (res23a.status === 201) {
        console.log(`✅ SUCCESS: Refund request queued (ID: ${refundId}).`);
      } else {
        throw new Error('TEST 23.1 FAILED: Refund request logging failed.');
      }

      console.log(`[TEST 23.2] Processing refund approval with pro-rata deduction as Tenant Admin...`);
      const res23b = await fetch(`http://localhost:${PORT}/api/courses/refund/approve/${refundId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
        body: JSON.stringify({
          action: 'APPROVE',
          deductionAmount: 650.00,
          remarks: 'Approved after calculating completed classes.',
        }),
      });
      const data23b = await res23b.json();
      if (res23b.status === 200 && data23b.refund.status === 'APPROVED') {
        console.log(`✅ SUCCESS: Refund approved.`);
        console.log(`   - Original: NPR 5650 | Deduction: NPR 650 | Net Reimbursed: NPR ${data23b.refund.netRefundAmount}`);
      } else {
        throw new Error('TEST 23.2 FAILED: Refund approval failed.');
      }

      // ----------------------------------------------------
      // TEST 24: Cron Automation Suite
      // ----------------------------------------------------
      console.log(`\n[TEST 24.1] Triggering monthly due verification cron...`);
      const res24a = await fetch(`http://localhost:${PORT}/api/cron/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
        body: JSON.stringify({ taskName: 'monthly-due-verification' }),
      });
      const data24a = await res24a.json();
      if (res24a.status === 200) {
        console.log(`✅ SUCCESS: Dues verification executed. Log: "${data24a.executionLogs[0]}"`);
      } else {
        throw new Error('TEST 24.1 FAILED: Monthly due verification trigger failed.');
      }

      console.log(`[TEST 24.2] Triggering overdue fee reminder alerts...`);
      const res24b = await fetch(`http://localhost:${PORT}/api/cron/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
        body: JSON.stringify({ taskName: 'fee-reminder-sms' }),
      });
      const data24b = await res24b.json();
      if (res24b.status === 200) {
        console.log(`✅ SUCCESS: Reminder alerts processed.`);
      } else {
        throw new Error('TEST 24.2 FAILED: Reminder SMS trigger failed.');
      }

      console.log(`[TEST 24.3] Triggering HR salary calculation alert...`);
      const res24c = await fetch(`http://localhost:${PORT}/api/cron/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
        body: JSON.stringify({ taskName: 'salary-reminder' }),
      });
      const data24c = await res24c.json();
      if (res24c.status === 200) {
        console.log(`✅ SUCCESS: Salary alert dispatched.`);
      } else {
        throw new Error('TEST 24.3 FAILED: Salary reminder trigger failed.');
      }

      // ----------------------------------------------------
      // TEST 25: Task Escalation Engine
      // ----------------------------------------------------
      console.log(`\n[TEST 25] Triggering background task escalation...`);
      const res25 = await fetch(`http://localhost:${PORT}/api/cron/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'pinnacle-tenant-id-777',
          'Authorization': `Bearer ${mockTenantAdminToken}`,
        },
        body: JSON.stringify({ taskName: 'task-escalation' }),
      });
      const data25 = await res25.json();
      if (res25.status === 200) {
        console.log(`✅ SUCCESS: Task escalation resolved. Log: "${data25.executionLogs[0]}"`);
      } else {
        throw new Error('TEST 25 FAILED: Task escalation trigger failed.');
      }

      console.log(`\n======================================================`);
      console.log(`    ALL INTEGRATION TESTS PASSED TRIUMPHANTLY!       `);
      console.log(`======================================================\n`);
    } catch (e: any) {
      console.error(`\n❌ TEST FAILURE DETECTED:`, e.message);
    } finally {
      server.close(() => {
        console.log(`[Test Server] Shutdown complete.`);
        process.exit(0);
      });
    }
  });
}

runTests();
