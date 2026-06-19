import { Router } from 'express';
import healthRoutes from './health';
import opportunitiesRoutes from './opportunities';
import symbolsRoutes from './symbols';
import authRoutes from './auth';
import watchlistRoutes from './watchlist';
import alertsRoutes from './alerts';
import adminRoutes from './admin';
import settingsRoutes from './settings';

const router = Router();

router.use('/health', healthRoutes);
router.use('/opportunities', opportunitiesRoutes);
router.use('/symbols', symbolsRoutes);
router.use('/auth', authRoutes);
router.use('/watchlist', watchlistRoutes);
router.use('/alerts', alertsRoutes);
router.use('/admin', adminRoutes);
router.use('/settings', settingsRoutes);

export default router;
