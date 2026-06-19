import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  const unreadOnly = req.query.unread === 'true';
  const alerts = await prisma.alert.findMany({
    where: {
      userId: req.userId,
      ...(unreadOnly && { isRead: false }),
    },
    include: { symbol: { select: { symbol: true } } },
    orderBy: { triggeredAt: 'desc' },
    take: 100,
  });

  res.json({
    data: alerts.map((a) => ({
      id: a.id,
      alertType: a.alertType,
      title: a.title,
      message: a.message,
      symbol: a.symbol?.symbol,
      isRead: a.isRead,
      triggeredAt: a.triggeredAt,
      metadata: a.metadata,
    })),
    unreadCount: alerts.filter((a) => !a.isRead).length,
  });
});

router.patch('/:id/read', async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  await prisma.alert.updateMany({
    where: { id, userId: req.userId },
    data: { isRead: true },
  });
  res.json({ success: true });
});

router.patch('/read-all', async (req: AuthRequest, res: Response) => {
  await prisma.alert.updateMany({
    where: { userId: req.userId, isRead: false },
    data: { isRead: true },
  });
  res.json({ success: true });
});

router.get('/settings', async (req: AuthRequest, res: Response) => {
  const settings = await prisma.alertSetting.findUnique({ where: { userId: req.userId } });
  res.json({ data: settings });
});

router.put('/settings', async (req: AuthRequest, res: Response) => {
  const settings = await prisma.alertSetting.upsert({
    where: { userId: req.userId! },
    update: req.body,
    create: { userId: req.userId!, ...req.body },
  });
  res.json({ data: settings });
});

export default router;
