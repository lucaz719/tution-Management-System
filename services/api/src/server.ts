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
import socialRouter from './routes/social';
import certificatesRouter from './routes/certificates';
import financesRouter from './routes/finances';
import canteenRouter from './routes/canteen';
import vehiclesRouter from './routes/vehicles';
import staticRouter from './routes/static';
import authRouter from './routes/auth';
import leavesRouter from './routes/leaves';
import communicationRouter from './routes/communication';
import appointmentsRouter from './routes/appointments';
import resourcesRouter from './routes/resources';
import cronRouter from './routes/cron';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Enable CORS and parsing of JSON payloads
app.use(cors());
app.use(express.json());

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

// Global Tenant Isolation Middleware (Automatically extracts x-tenant-id or auth claims)
app.use(tenantMiddleware);

// Bind domain routers
app.use('/api/auth', authRouter);
app.use('/api/onboarding', onboardingRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/homework', homeworkRouter);
app.use('/api/academic-events', academicEventsRouter);
app.use('/api/classes/personalized', personalizedClassesRouter);
app.use('/api/performance', performanceRouter);
app.use('/api/hr', hrRouter);
app.use('/api/social', socialRouter);
app.use('/api/certificates', certificatesRouter);
app.use('/api/finances', financesRouter);
app.use('/api/canteen', canteenRouter);
app.use('/api/vehicles', vehiclesRouter);
app.use('/api/leaves', leavesRouter);
app.use('/api/communication', communicationRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/resources', resourcesRouter);
app.use('/api/cron', cronRouter);

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
