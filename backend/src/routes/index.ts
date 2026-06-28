import { Router } from 'express';
import healthRoutes from './health';
import opportunitiesRoutes from './opportunities';
import symbolsRoutes from './symbols';
import authRoutes from './auth';
import watchlistRoutes from './watchlist';
import journalRoutes from './journal';
import alertsRoutes from './alerts';
import adminRoutes from './admin';
import settingsRoutes from './settings';
import marketsRoutes from './markets';
import signalsRoutes from './signals';

const router = Router();

router.use('/health', healthRoutes);
router.use('/opportunities', opportunitiesRoutes);
router.use('/markets', marketsRoutes);
router.use('/signals', signalsRoutes);
router.use('/symbols', symbolsRoutes);
router.use('/auth', authRoutes);
router.use('/watchlist', watchlistRoutes);
router.use('/journal', journalRoutes);
router.use('/alerts', alertsRoutes);
router.use('/admin', adminRoutes);
router.use('/settings', settingsRoutes);

export default router;
