import { Router } from 'express';
import { PartiesController } from './parties.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { UserRole } from '../../shared/constants';

const router = Router();

router.use(authenticate);

const managers = authorize([UserRole.OWNER, UserRole.MANAGER]);

// Customers
router.get('/customers', PartiesController.listCustomers);
router.post('/customers', PartiesController.createCustomer);
router.get('/customers/:id/ledger', PartiesController.getCustomerLedger);
router.patch('/customers/:id', managers, PartiesController.updateCustomer);
router.delete('/customers/:id', managers, PartiesController.deleteCustomer);

// Suppliers
router.get('/suppliers', PartiesController.listSuppliers);
router.post('/suppliers', PartiesController.createSupplier);
router.get('/suppliers/:id/ledger', PartiesController.getSupplierLedger);
router.patch('/suppliers/:id', managers, PartiesController.updateSupplier);
router.delete('/suppliers/:id', managers, PartiesController.deleteSupplier);

export default router;
