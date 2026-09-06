import { Prisma } from '@prisma/client';
import { Router, Response } from 'express';
import prisma from '../utils/db';
import { TenantRequest } from '../middleware/tenant';
import { authMiddleware, hasPermission } from '../middleware/auth';
import { canAccessBranch } from '../utils/access-control';
import { parseSchedule } from '../utils/schedule';

const router = Router();

// 1. Create a Personalized Class (Branch Admin only)
router.post(
  '/',
  authMiddleware,
  hasPermission('manage_personalized_classes'),
  async (req: TenantRequest, res: Response) => {
    const { branchId, name, courseId, schedule, feeStructure } = req.body;

    if (!branchId || !name || !courseId || !schedule || !feeStructure) {
      return res.status(400).json({
        error: 'Missing required parameters: branchId, name, courseId, schedule, feeStructure.',
      });
    }
    if (!canAccessBranch(req.user!, branchId)) {
      return res.status(403).json({ error: 'You may only create personalized classes for your assigned branch.' });
    }
    const parsedSchedule = parseSchedule(schedule);
    if (!parsedSchedule.success) return res.status(400).json({ error: parsedSchedule.error });

    try {
      // In a regular setup, a personalized class is modeled as a Class with PERSONALIZED course type
      const personalizedClass = await prisma.class.create({
        data: {
          branchId,
          courseId,
          name,
          schedule: parsedSchedule.data as unknown as Prisma.InputJsonValue,
        },
      });

      return res.status(201).json({
        message: 'Personalized class created successfully.',
        class: personalizedClass,
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to create personalized class.' });
    }
  }
);

// 2. Enroll a Student in a Personalized Class (Branch Admin only)
router.post(
  '/enroll',
  authMiddleware,
  hasPermission('manage_personalized_classes'),
  async (req: TenantRequest, res: Response) => {
    const { studentId, courseId, classId, admissionDate } = req.body;

    if (!studentId || !courseId || !classId) {
      return res.status(400).json({
        error: 'Missing required enrollment parameters: studentId, courseId, classId.',
      });
    }

    try {
      const enrollment = await prisma.enrollment.create({
        data: {
          studentId,
          courseId,
          classId,
          status: 'ACTIVE',
          admissionDate: admissionDate ? new Date(admissionDate) : new Date(),
        },
      });

      return res.status(201).json({
        message: 'Student enrolled in personalized class successfully.',
        enrollment,
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to enroll student in personalized class.' });
    }
  }
);

// 3. Mark Teacher Session Attendance for Personalized Class (Teacher only)
router.post(
  '/attendance',
  authMiddleware,
  hasPermission('mark_geo_attendance'),
  async (req: TenantRequest, res: Response) => {
    const { classId, date, checkInTime, checkOutTime, totalMinutes, updateContent } = req.body;
    const teacherId = req.user!.id;

    if (!classId || !date || !checkInTime || !checkOutTime || !updateContent) {
      return res.status(400).json({
        error: 'Missing required session credentials: classId, date, checkInTime, checkOutTime, updateContent.',
      });
    }

    try {
      const session = await prisma.teacherSession.create({
        data: {
          teacherId,
          classId,
          date: new Date(date),
          status: 'PRESENT_CONFIRMED',
          checkInTime: new Date(checkInTime),
          checkOutTime: new Date(checkOutTime),
          totalMinutes: totalMinutes || 60,
          dailyUpdateSubmitted: true,
          updateContent,
        },
      });

      return res.status(201).json({
        message: 'Personalized class session log saved successfully.',
        session,
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to save personalized class session.' });
    }
  }
);

export default router;
