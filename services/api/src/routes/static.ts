import { Router } from 'express';
import express from 'express';
import path from 'path';

const router = Router();
// Serve built UI assets (or raw files during development) from ui-login package
const uiPath = path.resolve(__dirname, '../../../packages/ui-login/dist');
router.use('/', express.static(uiPath));
export default router;
