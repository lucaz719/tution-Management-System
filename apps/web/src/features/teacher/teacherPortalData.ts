import type { TeacherDashboard } from './teacherPortalTypes';

const today = new Date().toISOString();
const day = new Intl.DateTimeFormat('en', { weekday: 'long' }).format(new Date());

export const demoTeacherWorkspace: TeacherDashboard = {
  demoMode: true,
  generatedAt: today,
  teacher: {
    id: 'demo-teacher', name: 'Shyam Adhikari', email: 'teacher@demo.tms.local', designation: 'Senior Mathematics Teacher',
    joiningDate: '2023-04-16T00:00:00.000Z', contractType: 'FIXED', branches: [{ id: 'demo-main-branch', name: 'Main Branch' }],
  },
  statistics: { attendanceRate: 94, presentDays: 47, approvedLeaveDays: 3, totalSessions: 112, updateCompliance: 91, assignedClasses: 3 },
  attendance: { checkedIn: false, lastStampType: 'OUT', lastStampAt: today },
  stamps: [
    { id: 'demo-stamp-1', stampType: 'IN', timestamp: new Date(Date.now() - 3_600_000).toISOString(), branchName: 'Main Branch', gpsAccuracy: 12 },
    { id: 'demo-stamp-2', stampType: 'OUT', timestamp: today, branchName: 'Main Branch', gpsAccuracy: 9 },
  ],
  todayClasses: [
    { sessionId: 'demo-session-1', classId: 'demo-class-8', className: 'Grade 8 · Section A', courseName: 'Mathematics', branch: { id: 'demo-main-branch', name: 'Main Branch', radiusMeters: 120 }, schedule: [{ day, start: '08:00', end: '09:00', room: 'Room 2A' }], status: 'PRESENT_UPDATE_PENDING', dailyUpdateSubmitted: false, checkInTime: null, checkOutTime: null },
    { sessionId: 'demo-session-2', classId: 'demo-class-7', className: 'Grade 7 · Section B', courseName: 'Science', branch: { id: 'demo-main-branch', name: 'Main Branch', radiusMeters: 120 }, schedule: [{ day, start: '10:15', end: '11:15', room: 'Lab 1' }], status: 'SCHEDULED', dailyUpdateSubmitted: true, checkInTime: null, checkOutTime: null },
  ],
  pendingUpdates: [{ sessionId: 'demo-session-1', classId: 'demo-class-8', className: 'Grade 8 · Section A', courseName: 'Mathematics', date: today }],
  classes: [
    {
      id: 'demo-class-8', name: 'Grade 8 · Section A', subject: 'Mathematics', type: 'REGULAR', schedule: [{ day: 'Monday', start: '08:00', end: '09:00', room: 'Room 2A' }, { day: 'Wednesday', start: '08:00', end: '09:00', room: 'Room 2A' }, { day: 'Friday', start: '09:15', end: '10:15', room: 'Room 2A' }],
      branch: { id: 'demo-main-branch', name: 'Main Branch', address: 'Kathmandu, Nepal', radiusMeters: 120 },
      students: [
        { id: 'demo-student-1', name: 'Aarav Shrestha', status: 'ACTIVE' }, { id: 'demo-student-2', name: 'Mira Karki', status: 'ACTIVE' },
        { id: 'demo-student-3', name: 'Sujal Thapa', status: 'BLOCKED' }, { id: 'demo-student-4', name: 'Nisha Rai', status: 'ACTIVE' },
      ],
      attendance: [
        { id: 'demo-att-1', studentId: 'demo-student-1', date: today, status: 'PRESENT' }, { id: 'demo-att-2', studentId: 'demo-student-2', date: today, status: 'EXCUSED' },
        { id: 'demo-att-3', studentId: 'demo-student-3', date: today, status: 'ABSENT' }, { id: 'demo-att-4', studentId: 'demo-student-4', date: today, status: 'PRESENT' },
      ],
      syllabi: [{ id: 'demo-syllabus-1', subject: 'Mathematics', chapters: [
        { id: 'demo-chapter-1', title: 'Numbers and operations', position: 1, status: 'COMPLETED' },
        { id: 'demo-chapter-2', title: 'Algebraic expressions', position: 2, status: 'IN_PROGRESS' },
        { id: 'demo-chapter-3', title: 'Linear equations', position: 3, status: 'LEFT' },
        { id: 'demo-chapter-4', title: 'Geometry and measurement', position: 4, status: 'LEFT' },
      ], dailyLogs: [{ id: 'demo-log-1', chapterId: 'demo-chapter-2', logDate: today, status: 'IN_PROGRESS', notes: 'Worked through examples 1–6.' }] }],
      homework: [{ id: 'demo-homework-1', subject: 'Mathematics', title: 'Algebra practice set', description: 'Complete questions 1–10.', contentUrl: null, deadline: new Date(Date.now() + 3 * 86_400_000).toISOString(), createdAt: today }],
    },
    {
      id: 'demo-class-7', name: 'Grade 7 · Section B', subject: 'Science', type: 'REGULAR', schedule: [{ day: 'Tuesday', start: '10:15', end: '11:15', room: 'Lab 1' }, { day: 'Thursday', start: '10:15', end: '11:15', room: 'Lab 1' }],
      branch: { id: 'demo-main-branch', name: 'Main Branch', address: 'Kathmandu, Nepal', radiusMeters: 120 },
      students: [{ id: 'demo-student-5', name: 'Prisha Gurung', status: 'ACTIVE' }, { id: 'demo-student-6', name: 'Rohan Basnet', status: 'ACTIVE' }], attendance: [], syllabi: [], homework: [],
    },
    {
      id: 'demo-class-personal', name: 'Personalized Algebra Support', subject: 'Algebra', type: 'PERSONALIZED', schedule: [{ day: 'Saturday', start: '13:30', end: '14:15', room: 'Studio 3' }],
      branch: { id: 'demo-lakeside', name: 'Lakeside Branch', address: 'Pokhara, Nepal', radiusMeters: 80 }, students: [{ id: 'demo-student-7', name: 'Aarav Shrestha', status: 'ACTIVE' }], attendance: [], syllabi: [], homework: [],
    },
  ],
  results: [
    { id: 'demo-result-1', studentId: 'demo-student-1', studentName: 'Aarav Shrestha', subject: 'Mathematics', assessment: 'Unit Test 1', score: 22, maximum: 25, passMarks: 10, percentile: 92, publishedAt: today, testDate: today },
    { id: 'demo-result-2', studentId: 'demo-student-2', studentName: 'Mira Karki', subject: 'Mathematics', assessment: 'Unit Test 1', score: 19, maximum: 25, passMarks: 10, percentile: 75, publishedAt: null, testDate: today },
  ],
  profile: { performance: { attendanceScore: 94, dailyUpdateComplianceScore: 91, feedbackScore: 88, leaveComplianceScore: 96 }, salaryStructure: { basicMonthly: 42000 } },
  leaves: [
    { id: 'demo-leave-1', leaveType: 'CASUAL', startDate: new Date(Date.now() - 14 * 86_400_000).toISOString(), endDate: new Date(Date.now() - 13 * 86_400_000).toISOString(), reason: 'Family event', status: 'APPROVED_LEVEL2', branch: { name: 'Main Branch' } },
    { id: 'demo-leave-2', leaveType: 'EARLY_OUT', startDate: new Date(Date.now() + 5 * 86_400_000).toISOString(), endDate: new Date(Date.now() + 5 * 86_400_000).toISOString(), reason: 'Medical appointment', status: 'PENDING', branch: { name: 'Main Branch' } },
  ],
  payrolls: [
    { id: 'demo-pay-1', month: new Date().getMonth() + 1, year: new Date().getFullYear(), baseSalary: 42000, attendanceDeductions: 0, bonuses: 2500, netPayable: 44500, status: 'PENDING', paymentDate: null },
    { id: 'demo-pay-2', month: new Date().getMonth() || 12, year: new Date().getMonth() ? new Date().getFullYear() : new Date().getFullYear() - 1, baseSalary: 42000, attendanceDeductions: 500, bonuses: 1000, netPayable: 42500, status: 'MANUALLY_PAID', paymentDate: new Date(Date.now() - 20 * 86_400_000).toISOString() },
  ],
};

export function withTeacherDemoData(live: TeacherDashboard): TeacherDashboard {
  const lacksTeachingData = !live.classes?.length;
  if (lacksTeachingData) return { ...demoTeacherWorkspace, teacher: { ...demoTeacherWorkspace.teacher, ...live.teacher, branches: live.teacher.branches.length ? live.teacher.branches : demoTeacherWorkspace.teacher.branches } };
  const demoMode = !live.todayClasses.length || !live.results.length || !live.leaves.length || !live.payrolls.length;
  return {
    ...live,
    demoMode,
    todayClasses: live.todayClasses.length ? live.todayClasses : demoTeacherWorkspace.todayClasses,
    pendingUpdates: live.pendingUpdates.length ? live.pendingUpdates : demoTeacherWorkspace.pendingUpdates,
    results: live.results.length ? live.results : demoTeacherWorkspace.results,
    leaves: live.leaves.length ? live.leaves : demoTeacherWorkspace.leaves,
    payrolls: live.payrolls.length ? live.payrolls : demoTeacherWorkspace.payrolls,
  };
}
