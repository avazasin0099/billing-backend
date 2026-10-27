import { Request, Response, NextFunction } from 'express';
import { SyncService } from './sync.service';
import { sendSuccess } from '../../shared/utilities/response';
import { AppError } from '../../shared/errors/app-error';

export class SyncController {
  public static async pushEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      const userId = req.user?.id;
      const deviceId = (req.headers['x-device-id'] as string) || req.body.deviceId || 'browser-client';

      if (!shopId || !userId) throw AppError.badRequest('Shop and user context required');
      const { events } = req.body;

      if (!Array.isArray(events)) {
        throw AppError.badRequest('Events array is required');
      }

      const result = await SyncService.processSyncEvents(shopId, deviceId, userId, events);
      return sendSuccess(res, result, 'Sync events processed');
    } catch (error) {
      next(error);
    }
  }

  public static async getConflicts(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      if (!shopId) throw AppError.badRequest('Shop context required');
      const conflicts = await SyncService.getConflicts(shopId);
      return sendSuccess(res, conflicts);
    } catch (error) {
      next(error);
    }
  }
}
