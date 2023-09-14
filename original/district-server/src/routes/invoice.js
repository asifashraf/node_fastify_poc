const express = require('express');
const router = express.Router();
const authMiddleware = require('../lib/middlewares/auth-middleware');
const onlyAuthMiddleware = require('../lib/middlewares/only-auth-middleware');
const { ksaStoreInvoiceController } = require('../controllers/ksa-store-invoice-controller');

router.get('/ksa/download-store-invoice',
  onlyAuthMiddleware,
  authMiddleware,
  ksaStoreInvoiceController);

module.exports = router;
