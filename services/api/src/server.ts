import 'dotenv/config';
import express, { Response } from 'express';
import cors from 'cors';
import { tenantMiddleware, TenantRequest } from './middleware/tenant';
import onboardingRouter from './routes/onboarding';
import coursesRouter from './routes/courses';
import attendanceRouter from './routes/attendance';
import homeworkRouter from './routes/homework';
import academicEventsRouter from './routes/academic-events';
import personalizedClassesRouter from './routes/personalized-classes';
import performanceRouter from './routes/performance';
import hrRouter from './routes/hr';
import certificatesRouter from './routes/certificates';
import financesRouter from './routes/finances';
import staticRouter from './routes/static';
import authRouter from './routes/auth';
import branchesRouter from './routes/branches';
import usersRouter from './routes/users';
import teacherRouter from './routes/teacher';
import gradesRouter from './routes/grades';
import leavesRouter from './routes/leaves';
import communicationRouter from './routes/communication';
import appointmentsRouter from './routes/appointments';
import resourcesRouter from './routes/resources';
import cronRouter from './routes/cron';
import parentRouter from './routes/parent';
import receptionRouter from './routes/reception';

import { toNodeHandler } from 'better-auth/node';
import { auth } from './utils/auth';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Enable CORS and parsing of JSON payloads
app.use(cors({
  origin: process.env.WEB_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Health check endpoint (no tenant required)
app.get('/api/health', (req: TenantRequest, res: Response) => {
  return res.json({
    status: 'UP',
    timestamp: new Date(),
    tenantContext: req.tenantId || 'NONE',
  });
});

// Serve static login UI without tenant isolation
app.use('/login', staticRouter);

// Better Auth must receive the request before express.json() so its body
// parser and cookie/session handling remain intact.
app.all('/api/auth/*', toNodeHandler(auth));

app.use(express.json());

// Global tenant middleware; authenticated scope comes from the verified session.
app.use(tenantMiddleware);

// Bind domain routers
app.use('/api/auth', authRouter);
// Tenant provisioning is a development operator surface only. It is not
// mounted in the single-institution production deployment.
if (process.env.PLATFORM_ADMIN_ENABLED === 'true') {
  app.use('/api/onboarding', onboardingRouter);
}
app.use('/api/branches', branchesRouter);
app.use('/api/users', usersRouter);
app.use('/api/teacher', teacherRouter);
app.use('/api/grades', gradesRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/homework', homeworkRouter);
app.use('/api/academic-events', academicEventsRouter);
app.use('/api/classes/personalized', personalizedClassesRouter);
app.use('/api/performance', performanceRouter);
app.use('/api/hr', hrRouter);
app.use('/api/certificates', certificatesRouter);
app.use('/api/finances', financesRouter);
app.use('/api/leaves', leavesRouter);
app.use('/api/communication', communicationRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/resources', resourcesRouter);
app.use('/api/cron', cronRouter);
app.use('/api/parent', parentRouter);
app.use('/api/reception', receptionRouter);

// Centralized error handling middleware
app.use((err: any, req: TenantRequest, res: Response, next: express.NextFunction) => {
  console.error(err.stack);
  return res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred.',
  });
});

// Start listening only if executed directly
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TMS Server] Running at http://localhost:${PORT}`);
  });
}

export default app;
