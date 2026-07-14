import { Router, Response } from 'express';
import prisma from '../utils/db';
import { TenantRequest } from '../middleware/tenant';
import { authMiddleware, hasPermission } from '../middleware/auth';

const router = Router();

// The standard Nepali school ladder, used to seed a tenant's grades.
const DEFAULT_GRADES = [
  'Nursery', 'LKG', 'UKG',
  'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6',
  'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12',
];

// List grades for the tenant, ordered, with student + course counts.
router.get('/', authMiddleware, async (req: TenantRequest, res: Response) => {
  try {
    const grades = await prisma.grade.findMany({
      where: { tenantId: req.tenantId! },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { students: true, courses: true } } },
    });
    return res.json({
      grades: grades.map((g) => ({
        id: g.id,
        name: g.name,
        sortOrder: g.sortOrder,
        monthlyFee: g.monthlyFee,
        studentCount: g._count.students,
        courseCount: g._count.courses,
      })),
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to list grades.', details: error.message });
  }
});

// Grade detail — the "linked with everything" view: students in the grade, its
// courses, and the teachers who teach those courses (derived from class → teacher).
router.get('/:id', authMiddleware, async (req: TenantRequest, res: Response) => {
  const { id } = req.params;
  try {
    const grade = await prisma.grade.findFirst({ where: { id, tenantId: req.tenantId! } });
    if (!grade) {
      return res.status(404).json({ error: 'Grade not found in your institution.' });
    }

    const [students, courses] = await Promise.all([
      prisma.student.findMany({
        where: { gradeId: id },
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        orderBy: { user: { firstName: 'asc' } },
      }),
      prisma.course.findMany({
        where: { gradeId: id },
        include: {
          branch: { select: { name: true } },
          classes: { include: { assignedTeacher: { select: { id: true, firstName: true, lastName: true } } } },
          _count: { select: { classes: true, enrollments: true } },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    // Distinct teachers assigned to any class of this grade's courses.
    const teacherMap = new Map<string, { id: string; name: string }>();
    for (const course of courses) {
      for (const klass of course.classes) {
        if (klass.assignedTeacher) {
          teacherMap.set(klass.assignedTeacher.id, {
            id: klass.assignedTeacher.id,
            name: `${klass.assignedTeacher.firstName} ${klass.assignedTeacher.lastName}`,
          });
        }
      }
    }

    return res.json({
      id: grade.id,
      name: grade.name,
      studentCount: students.length,
      courseCount: courses.length,
      teacherCount: teacherMap.size,
      students: students.map((s) => ({
        studentId: s.id,
        userId: s.user.id,
        name: `${s.user.firstName} ${s.user.lastName}`,
        email: s.user.email,
      })),
      courses: courses.map((c) => ({
        id: c.id,
        name: c.name,
        branchName: c.branch.name,
        classCount: c._count.classes,
        enrollmentCount: c._count.enrollments,
      })),
      teachers: Array.from(teacherMap.values()),
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to load grade detail.', details: error.message });
  }
});

// Seed the default grade ladder (idempotent — skips any that already exist).
router.post('/seed-defaults', authMiddleware, hasPermission('manage_students'), async (req: TenantRequest, res: Response) => {
  try {
    const existing = await prisma.grade.findMany({ where: { tenantId: req.tenantId! }, select: { name: true } });
    const have = new Set(existing.map((g) => g.name));
    let created = 0;
    for (let i = 0; i < DEFAULT_GRADES.length; i++) {
      const name = DEFAULT_GRADES[i];
      if (have.has(name)) continue;
      await prisma.grade.create({ data: { tenantId: req.tenantId!, name, sortOrder: i } });
      created += 1;
    }
    return res.json({ message: `Added ${created} grade(s).`, created });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to seed grades.', details: error.message });
  }
});

// Create a grade.
router.post('/', authMiddleware, hasPermission('manage_students'), async (req: TenantRequest, res: Response) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const sortOrder = Number.isFinite(Number(req.body?.sortOrder)) ? Number(req.body.sortOrder) : 99;
  const monthlyFee = Number.isFinite(Number(req.body?.monthlyFee)) && Number(req.body.monthlyFee) >= 0 ? Math.round(Number(req.body.monthlyFee)) : 0;
  if (!name) {
    return res.status(400).json({ error: 'Grade name is required.' });
  }
  try {
    const grade = await prisma.grade.create({ data: { tenantId: req.tenantId!, name, sortOrder, monthlyFee } });
    return res.status(201).json({ message: 'Grade created.', grade });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'A grade with this name already exists.' });
    }
    return res.status(500).json({ error: 'Failed to create grade.', details: error.message });
  }
});

// Rename or reorder a grade.
router.put('/:id', authMiddleware, hasPermission('manage_students'), async (req: TenantRequest, res: Response) => {
  const { id } = req.params;
  try {
    const grade = await prisma.grade.findUnique({ where: { id } });
    if (!grade || grade.tenantId !== req.tenantId) {
      return res.status(404).json({ error: 'Grade not found in your institution.' });
    }
    const data: Record<string, unknown> = {};
    if (typeof req.body?.name === 'string' && req.body.name.trim()) data.name = req.body.name.trim();
    if (Number.isFinite(Number(req.body?.sortOrder))) data.sortOrder = Number(req.body.sortOrder);
    if (Number.isFinite(Number(req.body?.monthlyFee)) && Number(req.body.monthlyFee) >= 0) data.monthlyFee = Math.round(Number(req.body.monthlyFee));
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'Nothing to update.' });
    }
    const updated = await prisma.grade.update({ where: { id }, data });
    return res.json({ message: 'Grade updated.', grade: updated });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'A grade with this name already exists.' });
    }
    return res.status(500).json({ error: 'Failed to update grade.', details: error.message });
  }
});

// Delete a grade (blocked when students are assigned to it).
router.delete('/:id', authMiddleware, hasPermission('manage_students'), async (req: TenantRequest, res: Response) => {
  const { id } = req.params;
  try {
    const grade = await prisma.grade.findUnique({
      where: { id },
      include: { _count: { select: { students: true } } },
    });
    if (!grade || grade.tenantId !== req.tenantId) {
      return res.status(404).json({ error: 'Grade not found in your institution.' });
    }
    if (grade._count.students > 0) {
      return res.status(409).json({ error: `Cannot delete "${grade.name}" — ${grade._count.students} student(s) are assigned to it. Reassign them first.` });
    }
    await prisma.grade.delete({ where: { id } });
    return res.json({ message: 'Grade deleted.' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to delete grade.', details: error.message });
  }
});

export default router;
