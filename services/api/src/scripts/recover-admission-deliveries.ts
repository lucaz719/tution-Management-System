import 'dotenv/config';
import prisma from '../utils/db';
import { recoverAdmissionDeliveries } from '../services/admission-delivery';

recoverAdmissionDeliveries(process.env.ADMISSION_RECOVERY_TENANT_ID || undefined)
  .then(result => {
    console.log(JSON.stringify({ event: 'ADMISSION_DELIVERY_RECOVERY', ...result }));
    if (result.failed) process.exitCode = 1;
  })
  .catch(() => { console.error('Admission delivery recovery failed. Check database and delivery configuration.'); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
