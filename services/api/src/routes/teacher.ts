import { Router, Response } from 'express';
import prisma from '../utils/db';
import { TenantRequest } from '../middleware/tenant';
import { authMiddleware } from '../middleware/auth';
import { UserPayload } from '@tms/types';

const router = Router();

function teacherBranchId(user: UserPayload): string | null {
  const teacherRole = user.roles.find((r) => r.roleName === 'Teacher' && r.branchId);
  return teacherRole?.branchId ?? null;
}

// Start/end of the current day for date-range queries.
function dayBounds(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// Consolidated teacher dashboard: today's classes, the pending daily-update gate,
// current attendance state, and the branch geofence needed to mark in.
router.get('/dashboard', authMiddleware, async (req: TenantRequest, res: Response) => {
  const user = req.user as UserPayload;
  const teacherId = user.id;
  const branchId = teacherBranchId(user);

  try {
    const { start, end } = dayBounds();

    const branch = branchId
      ? await prisma.branch.findFirst({ where: { id: branchId, tenantId: req.tenantId! } })
      : null;

    // Today's sessions (each session = one class the teacher runs today).
    const todaySessions = await prisma.teacherSession.findMany({
      where: { teacherId, date: { gte: start, lte: end } },
      include: { class: { include: { course: true } } },
      orderBy: { createdAt: 'asc' },
    });

    // Pending daily-update gate: any session (today or earlier) not yet logged.
    const pendingSessions = await prisma.teacherSession.findMany({
      where: { teacherId, dailyUpdateSubmitted: false },
      include: { class: { include: { course: true } } },
      orderBy: { date: 'asc' },
    });

    // Current attendance state from today's stamps.
    const stamps = await prisma.teacherAttendance.findMany({
      where: { userId: teacherId, timestamp: { gte: start, lte: end } },
      orderBy: { timestamp: 'desc' },
      take: 1,
    });
    const lastStamp = stamps[0] ?? null;
    const checkedIn = lastStamp ? lastStamp.stampType === 'IN' || lastStamp.stampType === 'RE_IN' : false;

    return res.json({
      teacher: { id: user.id, name: `${user.firstName} ${user.lastName}` },
      branch: branch
        ? {
            id: branch.id,
            name: branch.name,
            latitude: branch.latitude,
            longitude: branch.longitude,
            radiusMeters: branch.radiusMeters,
          }
        : null,
      attendance: {
        checkedIn,
        lastStampType: lastStamp?.stampType ?? null,
        lastStampAt: lastStamp?.timestamp ?? null,
      },
      todayClasses: todaySessions.map((s) => ({
        sessionId: s.id,
        classId: s.classId,
        className: s.class.name,
        courseName: s.class.course.name,
        schedule: s.class.schedule,
        status: s.status,
        dailyUpdateSubmitted: s.dailyUpdateSubmitted,
        checkInTime: s.checkInTime,
        checkOutTime: s.checkOutTime,
      })),
      pendingUpdates: pendingSessions.map((s) => ({
        sessionId: s.id,
        classId: s.classId,
        className: s.class.name,
        courseName: s.class.course.name,
        date: s.date,
      })),
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to load teacher dashboard.', details: error.message });
  }
});

// Submit the daily update for one session (clears it from the pending gate).
router.post('/session/:sessionId/update', authMiddleware, async (req: TenantRequest, res: Response) => {
  const user = req.user as UserPayload;
  const { sessionId } = req.params;
  const updateContent = typeof req.body?.updateContent === 'string' ? req.body.updateContent.trim() : '';

  if (!updateContent) {
    return res.status(400).json({ error: 'A lesson summary is required.' });
  }

  try {
    // Ownership: only the assigned teacher can log their own session.
    const session = await prisma.teacherSession.findFirst({
      where: { id: sessionId, teacherId: user.id, class: { course: { tenantId: req.tenantId! } } },
    });
    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    const transition = await prisma.teacherSession.updateMany({
      where: {
        id: session.id,
        teacherId: user.id,
        dailyUpdateSubmitted: false,
      },
      data: {
        updateContent,
        dailyUpdateSubmitted: true,
        status: 'PRESENT_CONFIRMED',
      },
    });
    if (transition.count !== 1) {
      return res.status(409).json({ error: 'The daily update was already submitted by another request.' });
    }
    const updated = await prisma.teacherSession.findUniqueOrThrow({ where: { id: session.id } });

    return res.json({
      message: 'Daily update submitted.',
      session: { sessionId: updated.id, dailyUpdateSubmitted: true, status: updated.status },
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to submit daily update.', details: error.message });
  }
});

export default router;
