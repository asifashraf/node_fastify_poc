const {
  setupAuthContext,
} = require('../helpers/context-helpers');

const checkPermission = async (context, storeOrderSetId) => {
  if (context.auth.authProvider === 'authentication-service') {
    // from a customer
    const [customer, storeOrderSet] = await Promise.all([context.customer.getById(context.auth.id), context.storeOrderSet.getById(storeOrderSetId)]);
    if (!(customer && storeOrderSet && storeOrderSet.customerId === customer.id)) {
      throw new Error('Permission Denied'); // [attack_scope]
    }
  } else if (context.auth.authProvider === 'firebase') {
    const [admin, storeOrderSet] = await Promise.all([context.admin.getByAuthoId(context.auth.id), context.storeOrderSet.getById(storeOrderSetId)]);
    if (admin && storeOrderSet) {
      if (context.auth.isVendorAdmin) {
        // from admin-vendor user
        throw new Error('Permission Denied'); // [attack_scope]
      } else {
        // from general admin without portals
        context.checkPermission('storeOrder:view', 'ksa-store-invoice');
      }
    } else {
      throw new Error('Permission Denied'); // [attack_scope]
    }
  } else {
    throw new Error('Permission Denied'); // [attack_scope]
  }
};

exports.ksaStoreInvoiceController = async (req, res) => {
  const context = await setupAuthContext(req);
  try {
    const { storeOrderSetId } = req.query;
    context.kinesisLogger.sendLogEvent({ query: req.query }, 'ksaStoreInvoice-requested');
    await checkPermission(context, storeOrderSetId);
    if (!storeOrderSetId)
      throw new Error('storeOrderId is required');
    const storeOrderSet = await context.storeOrderSet.getById(storeOrderSetId);
    const { id } = storeOrderSet;
    const resVal = await context.storeOrderSet.getStoreOrderInvoiceURL({ id });
    res.json({
      invoiceUrl: resVal ? resVal : null
    });
    context.kinesisLogger.sendLogEvent({ query: req.query, resVal }, 'ksaStoreInvoice-returned');
  } catch (error) {
    context.kinesisLogger.sendLogEvent({
      error: error.message,
      stack: JSON.stringify(error.stack || {}),
    }, 'ksaStoreInvoice-error');
    return res.status(400).send({
      message: error.message || 'Something looks wrong',
    });
  }
};
