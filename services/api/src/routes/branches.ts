import { Router, Response } from 'express';
import prisma from '../utils/db';
import { TenantRequest } from '../middleware/tenant';
import { authMiddleware, hasPermission } from '../middleware/auth';

const router = Router();

// All branch operations are tenant-scoped: the tenant comes from the caller's
// verified session, so client-controlled tenant headers cannot cross boundaries.

// List branches for the current tenant
router.get('/', authMiddleware, async (req: TenantRequest, res: Response) => {
  try {
    const branches = await prisma.branch.findMany({
      where: { tenantId: req.tenantId! },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: { select: { userRoles: true, courses: true } },
      },
    });

    return res.json({
      branches: branches.map(branch => ({
        id: branch.id,
        name: branch.name,
        address: branch.address,
        latitude: branch.latitude,
        longitude: branch.longitude,
        radiusMeters: branch.radiusMeters,
        gracePeriodMinutes: branch.gracePeriodMinutes,
        createdAt: branch.createdAt,
        staffCount: branch._count.userRoles,
        courseCount: branch._count.courses,
      })),
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to list branches.', details: error.message });
  }
});

// Create a branch (Tenant Admin / manage_branches)
router.post('/', authMiddleware, hasPermission('manage_branches'), async (req: TenantRequest, res: Response) => {
  const { name, address, latitude, longitude, radiusMeters, gracePeriodMinutes } = req.body;

  if (!name || !address) {
    return res.status(400).json({ error: 'Branch name and address are required.' });
  }

  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: 'Valid latitude and longitude are required for the attendance geofence.' });
  }

  try {
    const branch = await prisma.branch.create({
      data: {
        tenantId: req.tenantId!,
        name: String(name).trim(),
        address: String(address).trim(),
        latitude: lat,
        longitude: lng,
        radiusMeters: Number.isFinite(Number(radiusMeters)) && Number(radiusMeters) > 0 ? Number(radiusMeters) : 100,
        gracePeriodMinutes:
          Number.isFinite(Number(gracePeriodMinutes)) && Number(gracePeriodMinutes) >= 0 ? Number(gracePeriodMinutes) : 15,
      },
    });

    return res.status(201).json({ message: 'Branch created.', branch });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to create branch.', details: error.message });
  }
});

// Update a branch (Tenant Admin / manage_branches)
router.put('/:id', authMiddleware, hasPermission('manage_branches'), async (req: TenantRequest, res: Response) => {
  const { id } = req.params;
  const { name, address, latitude, longitude, radiusMeters, gracePeriodMinutes } = req.body;

  try {
    const existing = await prisma.branch.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== req.tenantId) {
      return res.status(404).json({ error: 'Branch not found.' });
    }

    const data: Record<string, unknown> = {};
    if (typeof name === 'string' && name.trim()) data.name = name.trim();
    if (typeof address === 'string' && address.trim()) data.address = address.trim();
    if (latitude !== undefined && Number.isFinite(Number(latitude))) data.latitude = Number(latitude);
    if (longitude !== undefined && Number.isFinite(Number(longitude))) data.longitude = Number(longitude);
    if (radiusMeters !== undefined && Number.isFinite(Number(radiusMeters)) && Number(radiusMeters) > 0) {
      data.radiusMeters = Number(radiusMeters);
    }
    if (gracePeriodMinutes !== undefined && Number.isFinite(Number(gracePeriodMinutes)) && Number(gracePeriodMinutes) >= 0) {
      data.gracePeriodMinutes = Number(gracePeriodMinutes);
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided to update.' });
    }

    const branch = await prisma.branch.update({ where: { id }, data });
    return res.json({ message: 'Branch updated.', branch });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update branch.', details: error.message });
  }
});

export default router;
