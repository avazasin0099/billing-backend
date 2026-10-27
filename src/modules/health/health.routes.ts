import { Router, Request, Response } from 'express';
import { getSequelize } from '../../config/database';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  let dbStatus = 'healthy';
  try {
    await getSequelize().authenticate();
  } catch (err: any) {
    dbStatus = `unhealthy: ${err.message}`;
  }

  res.status(200).json({
    status: dbStatus === 'healthy' ? 'UP' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus,
  });
});

export default router;
