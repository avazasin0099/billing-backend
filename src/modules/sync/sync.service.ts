import { SyncEvent, SyncConflict, Invoice, Item, User } from '../../database/associations';
import { BillingService } from '../billing/billing.service';
import { logger } from '../../config/logger';
import { UserRole } from '../../shared/constants';

export interface ClientSyncEventDto {
  id: string; // client generated UUID
  eventType: string; // 'CREATE_INVOICE'
  entityName: string;
  entityId: string;
  payload: any;
  schemaVersion?: number;
}

export class SyncService {
  public static async processSyncEvents(
    shopId: string,
    deviceId: string,
    userId: string,
    events: ClientSyncEventDto[]
  ) {
    const results: { id: string; status: string; error?: string }[] = [];

    const syncUser = await User.findByPk(userId);
    const syncUserRole = (syncUser?.role as UserRole) || UserRole.CASHIER;

    for (const eventDto of events) {
      // 1. Idempotency Check
      const existingEvent = await SyncEvent.findByPk(eventDto.id);
      if (existingEvent) {
        results.push({ id: eventDto.id, status: existingEvent.status });
        continue;
      }

      // 2. Persist Sync Event
      const syncRecord = await SyncEvent.create({
        id: eventDto.id,
        shopId,
        deviceId,
        eventType: eventDto.eventType,
        entityName: eventDto.entityName,
        entityId: eventDto.entityId,
        payload: eventDto.payload,
        schemaVersion: eventDto.schemaVersion || 1,
        status: 'PENDING',
      });

      // 3. Process Event based on type
      try {
        if (eventDto.eventType === 'CREATE_INVOICE') {
          // Check for conflicts: e.g. items with zero or negative stock
          const itemIds = eventDto.payload.items?.map((i: any) => i.itemId) || [];
          const items = await Item.findAll({ where: { id: itemIds, shopId } });

          for (const item of items) {
            const reqItem = eventDto.payload.items.find((i: any) => i.itemId === item.id);
            if (reqItem && Number(item.currentStock) < Number(reqItem.quantity)) {
              // Log Conflict
              await SyncConflict.create({
                syncEventId: syncRecord.id,
                shopId,
                conflictType: 'INSUFFICIENT_STOCK_OFFLINE_OVERDRAFT',
                clientPayload: eventDto.payload,
                serverState: { currentStock: item.currentStock, itemName: item.name },
                resolutionStatus: 'OPEN',
                resolutionNotes: `Offline invoice sold ${reqItem.quantity} units while server stock had ${item.currentStock}. Stock went negative.`,
              });
            }
          }

          // Execute invoice creation (idempotent on the client event id).
          await BillingService.createInvoice(
            shopId,
            userId,
            { ...eventDto.payload, idempotencyKey: eventDto.payload.idempotencyKey || eventDto.id },
            syncUserRole
          );

          syncRecord.status = 'PROCESSED';
          syncRecord.processedAt = new Date();
          await syncRecord.save();

          results.push({ id: eventDto.id, status: 'PROCESSED' });
        } else {
          syncRecord.status = 'FAILED';
          syncRecord.errorMessage = `Unknown event type: ${eventDto.eventType}`;
          await syncRecord.save();
          results.push({ id: eventDto.id, status: 'FAILED', error: syncRecord.errorMessage });
        }
      } catch (err: any) {
        logger.error(`Failed to process sync event ${eventDto.id}:`, err);
        syncRecord.status = 'FAILED';
        syncRecord.errorMessage = err.message;
        await syncRecord.save();
        results.push({ id: eventDto.id, status: 'FAILED', error: err.message });
      }
    }

    return { processedCount: results.length, results };
  }

  public static async getConflicts(shopId: string) {
    return await SyncConflict.findAll({
      where: { shopId },
      order: [['createdAt', 'DESC']],
    });
  }
}
