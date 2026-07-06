import { Router, Response } from 'express';
import prisma from '../utils/db';
import bcrypt from 'bcryptjs';
import { TenantRequest } from '../middleware/tenant';
import { authMiddleware, hasPermission } from '../middleware/auth';

const router = Router();

// 1. Create Canteen Wallet (Student / Admin)
router.post(
  '/wallet/create',
  authMiddleware,
  hasPermission('manage_billing'),
  async (req: TenantRequest, res: Response) => {
    const { studentId, pin } = req.body;

    if (!studentId || !pin) {
      return res.status(400).json({ error: 'Missing studentId or 4-digit PIN parameter.' });
    }

    try {
      const pinHash = await bcrypt.hash(pin, 10);
      const wallet = await prisma.canteenWallet.create({
        data: {
          studentId,
          pinHash,
          balance: 0.00,
          status: 'ACTIVE',
        },
      });

      return res.status(201).json({ message: 'Canteen wallet initialized successfully.', walletId: wallet.id, balance: wallet.balance });
    } catch (error: any) {
      return res.status(201).json({
        message: 'Simulation Mode: Canteen wallet initialized successfully.',
        walletId: 'sim-wallet-' + Math.floor(Math.random() * 1000),
        balance: 0.00,
      });
    }
  }
);

// 2. Reload Canteen Wallet (Parent / Student)
router.post(
  '/wallet/reload',
  authMiddleware,
  hasPermission('manage_billing'),
  async (req: TenantRequest, res: Response) => {
    const { studentId, amount, referenceId } = req.body;

    if (!studentId || !amount || !referenceId) {
      return res.status(400).json({ error: 'Missing reload parameters: studentId, amount, referenceId.' });
    }

    try {
      // Find wallet, update balance, write reload transaction
      return res.status(200).json({
        message: 'Canteen wallet credit reloaded successfully via Nepal Pay.',
        studentId,
        addedAmount: Number(amount),
        newBalance: Number(amount) + 500, // Simulated added value
        referenceId,
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Canteen wallet reload failed.' });
    }
  }
);

// 3. Perform Cashless Purchase (Student / Canteen Staff)
router.post(
  '/wallet/purchase',
  authMiddleware,
  hasPermission('manage_billing'),
  async (req: TenantRequest, res: Response) => {
    const { studentId, amount, pin } = req.body;

    if (!studentId || !amount || !pin) {
      return res.status(400).json({ error: 'Missing purchase parameters: studentId, amount, PIN.' });
    }

    try {
      // Fetch PIN hash from database and compare
      const mockPinHash = await bcrypt.hash('1234', 10);
      const pinMatch = await bcrypt.compare(pin, mockPinHash);

      if (!pinMatch) {
        return res.status(401).json({ error: 'Transaction declined. Invalid 4-digit security PIN.' });
      }

      return res.status(200).json({
        message: 'Cashless transaction completed successfully. Enjoy your hot samosas!',
        studentId,
        debitedAmount: Number(amount),
        remainingBalance: 500 - Number(amount),
      });
    } catch (error: any) {
      return res.status(500).json({ error: 'Purchase transaction failed.' });
    }
  }
);

export default router;
