import { Request, Response, NextFunction } from 'express';

export interface TenantRequest extends Request {
  tenantId?: string;
  user?: any;
}

export function tenantMiddleware(req: TenantRequest, res: Response, next: NextFunction) {
  // 1. Check path to see if it bypasses tenant constraints
  // /api/auth is exempt because the tenant is derived from the user record at login,
  // before the client can know its tenant ID.
  const bypassPaths = ['/api/auth', '/api/health', '/api/certificates/verify'];
  if (process.env.PLATFORM_ADMIN_ENABLED === 'true') bypassPaths.push('/api/onboarding');
  if (bypassPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  // Tenant scope is populated authoritatively by authMiddleware from the
  // verified session. Client-controlled tenant headers are never trusted.
  if (req.user?.tenantId) req.tenantId = req.user.tenantId;
  next();
}
