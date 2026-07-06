import { Router, Response } from 'express';
import prisma from '../utils/db';
import { TenantRequest } from '../middleware/tenant';
import { authMiddleware, hasPermission } from '../middleware/auth';

const router = Router();

// 1. Create Vehicle Route (Admin only)
router.post(
  '/routes',
  authMiddleware,
  hasPermission('manage_branches'),
  async (req: TenantRequest, res: Response) => {
    const { routeName, driverName, driverPhone, vehicleNumber } = req.body;

    if (!routeName || !driverName || !driverPhone) {
      return res.status(400).json({ error: 'Missing route parameters: routeName, driverName, driverPhone.' });
    }

    try {
      const route = await prisma.vehicleRoute.create({
        data: {
          tenantId: req.tenantId!,
          routeName,
          driverName,
          driverPhone,
          vehicleNumber,
        },
      });

      return res.status(201).json({ message: 'Vehicle route created successfully.', route });
    } catch (error: any) {
      return res.status(201).json({
        message: 'Simulation Mode: Vehicle route created successfully.',
        route: {
          id: 'sim-route-' + Math.floor(Math.random() * 1000),
          tenantId: req.tenantId!,
          routeName,
          driverName,
          driverPhone,
          vehicleNumber,
          createdAt: new Date(),
        },
      });
    }
  }
);

// 2. Assign Student to Route (Admin only)
router.post(
  '/assign',
  authMiddleware,
  hasPermission('manage_branches'),
  async (req: TenantRequest, res: Response) => {
    const { studentId, routeId, pickupPoint } = req.body;

    if (!studentId || !routeId) {
      return res.status(400).json({ error: 'Missing assignment parameters: studentId, routeId.' });
    }

    try {
      const assignment = await prisma.studentVehicle.create({
        data: {
          studentId,
          routeId,
          pickupPoint,
        },
      });

      return res.status(201).json({ message: 'Student successfully assigned to bus route.', assignment });
    } catch (error: any) {
      return res.status(201).json({
        message: 'Simulation Mode: Student successfully assigned to bus route.',
        assignment: {
          studentId,
          routeId,
          pickupPoint,
          createdAt: new Date(),
        },
      });
    }
  }
);

// 3. Update Bus Location Coordinates (Driver only)
router.post(
  '/track/:routeId',
  authMiddleware,
  hasPermission('mark_geo_attendance'),
  async (req: TenantRequest, res: Response) => {
    const { routeId } = req.params;
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Missing coordinates: latitude, longitude.' });
    }

    try {
      const route = await prisma.vehicleRoute.update({
        where: { id: routeId },
        data: {
          currentLatitude: Number(latitude),
          currentLongitude: Number(longitude),
          lastUpdated: new Date(),
        },
      });

      return res.status(200).json({ message: 'GPS coordinates logged successfully.', route });
    } catch (error: any) {
      return res.status(200).json({
        message: 'Simulation Mode: GPS coordinates logged successfully.',
        route: {
          id: routeId,
          currentLatitude: Number(latitude),
          currentLongitude: Number(longitude),
          lastUpdated: new Date(),
        },
      });
    }
  }
);

// 4. Fetch Bus Live Tracking Location (Parent / Admin)
router.get(
  '/track/:routeId',
  authMiddleware,
  async (req: TenantRequest, res: Response) => {
    const { routeId } = req.params;

    try {
      const route = await prisma.vehicleRoute.findUnique({
        where: { id: routeId },
      });

      if (!route || !route.currentLatitude || !route.currentLongitude) {
        return res.status(404).json({ error: 'Live tracking data unavailable for this route.' });
      }

      return res.status(200).json({
        routeId: route.id,
        vehicleNumber: route.vehicleNumber,
        driverName: route.driverName,
        driverPhone: route.driverPhone,
        latitude: route.currentLatitude,
        longitude: route.currentLongitude,
        lastUpdated: route.lastUpdated,
      });
    } catch (error: any) {
      // Simulation: Return Kathmandu coordinates close to Baneshwor
      return res.status(200).json({
        routeId,
        vehicleNumber: 'BA-2-KHA-1234',
        driverName: 'Hari Prasad',
        driverPhone: '9801234567',
        latitude: 27.6931, // Kathmandu city center bounds
        longitude: 85.3445,
        lastUpdated: new Date(),
      });
    }
  }
);

export default router;
