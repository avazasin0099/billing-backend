import { Router } from 'express';
import { PartiesController } from './parties.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

router.use(authenticate);

// Customers
router.get('/customers', PartiesController.listCustomers);
router.post('/customers', PartiesController.createCustomer);
router.get('/customers/:id/ledger', PartiesController.getCustomerLedger);

// Suppliers
router.get('/suppliers', PartiesController.listSuppliers);
router.post('/suppliers', PartiesController.createSupplier);
router.get('/suppliers/:id/ledger', PartiesController.getSupplierLedger);

export default router;
