import { Router, Response } from 'express';
import { db } from '../lib/db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  const unreadOnly = req.query.unread === 'true';
  const alerts = await db.alerts.findByUserId(req.userId!, { unreadOnly, limit: 100 });

  const data = await Promise.all(
    alerts.map(async (a) => {
      const symbol = a.symbolId ? await db.symbols.findById(a.symbolId) : null;
      return {
        id: a.id,
        alertType: a.alertType,
        title: a.title,
        message: a.message,
        symbol: symbol?.symbol,
        isRead: a.isRead,
        triggeredAt: a.triggeredAt,
        metadata: a.metadata,
      };
    })
  );

  res.json({
    data,
    unreadCount: data.filter((a) => !a.isRead).length,
  });
});

router.patch('/:id/read', async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  await db.alerts.markRead(id, req.userId!);
  res.json({ success: true });
});

router.patch('/read-all', async (req: AuthRequest, res: Response) => {
  await db.alerts.markAllRead(req.userId!);
  res.json({ success: true });
});

router.get('/settings', async (req: AuthRequest, res: Response) => {
  const settings = await db.alertSettings.findByUserId(req.userId!);
  res.json({ data: settings });
});

router.put('/settings', async (req: AuthRequest, res: Response) => {
  const settings = await db.alertSettings.upsert(req.userId!, req.body);
  res.json({ data: settings });
});

export default router;
