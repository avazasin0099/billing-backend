import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import itemsRoutes from '../modules/items/items.routes';
import inventoryRoutes from '../modules/inventory/inventory.routes';
import billingRoutes from '../modules/billing/billing.routes';
import paymentsRoutes from '../modules/payments/payments.routes';
import purchasesRoutes from '../modules/purchases/purchases.routes';
import partiesRoutes from '../modules/parties/parties.routes';
import expensesRoutes from '../modules/expenses/expenses.routes';
import reportsRoutes from '../modules/reports/reports.routes';
import syncRoutes from '../modules/sync/sync.routes';
import staffRoutes from '../modules/staff/staff.routes';
import healthRoutes from '../modules/health/health.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/items', itemsRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/invoices', billingRoutes);
router.use('/payments', paymentsRoutes);
router.use('/purchases', purchasesRoutes);
router.use('/parties', partiesRoutes);
router.use('/expenses', expensesRoutes);
router.use('/reports', reportsRoutes);
router.use('/sync', syncRoutes);
router.use('/staff', staffRoutes);

export default router;
