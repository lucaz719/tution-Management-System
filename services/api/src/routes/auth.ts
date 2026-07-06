import { Router, Response } from 'express';
import prisma from '../utils/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { TenantRequest } from '../middleware/tenant';
import { UserPayload } from '@tms/types';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'tms_default_secret_jwt_2026';

router.post('/login', async (req: TenantRequest, res: Response) => {
  const { email, password } = req.body;
  const tenantId = req.tenantId;

  if (!email || !password || !tenantId) {
    return res.status(400).json({ error: 'Email, password, and tenant ID are required.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        userRoles: {
          include: {
            role: true,
          }
        }
      }
    });

    if (!user || user.tenantId !== tenantId) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'User account is not active.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const payload: UserPayload = {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.userRoles.map(ur => ({
        roleName: ur.role.name,
        permissions: Array.isArray(ur.role.permissions) ? (ur.role.permissions as string[]) : [],
        branchId: ur.branchId,
      })),
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    return res.json({ token, user: payload });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
