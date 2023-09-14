const { first, map, uniq, includes } = require('lodash');

const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const {
  storeOrderStatusName,
  storeOrderSetStatusName,
} = require('../root/enums');
const { triggerInvoiceGenerator } = require('../../lib/e-invoice/invoice-trigger');

class StoreOrderSetStatus extends BaseModel {
  constructor(db, context) {
    super(db, 'store_order_set_statuses', context);
    this.loaders = createLoaders(this);
  }

  getAllByStoreOrderSet(storeOrderSetId) {
    this.loaders.statusHistory.clear(storeOrderSetId);
    return this.loaders.statusHistory.load(storeOrderSetId);
  }

  getLatestByStoreOrderSet(storeOrderSetId) {
    return this.getAllByStoreOrderSet(storeOrderSetId).then(first);
  }

  async updateStatus(storeOrderSetId, context) {
    const storeOrders = await context.storeOrder.getAllByStoreOrderSet(
      storeOrderSetId
    );
    const latestStoreOrderSetStatus = context.storeOrderSetStatus.getLatestByStoreOrderSet(
      storeOrderSetId
    );
    const latestStoreOrderStatuses = uniq(
      map(
        await Promise.all(
          map(storeOrders, storeOrder =>
            context.storeOrderStatus.getLatestByStoreOrder(storeOrder.id)
          )
        ),
        s => s.status
      )
    );
    let newStatus = null;
    if (
      latestStoreOrderStatuses.length === 1 &&
      includes(
        [
          storeOrderStatusName.DISPATCHED,
          storeOrderStatusName.DELIVERED,
          storeOrderStatusName.REJECTED,
          storeOrderStatusName.CANCELED,
        ],
        latestStoreOrderStatuses[0]
      )
    ) {
      newStatus = latestStoreOrderStatuses[0];
    } else if (latestStoreOrderStatuses.length > 0) {
      if (includes(latestStoreOrderStatuses, storeOrderStatusName.DISPATCHED)) {
        newStatus = storeOrderSetStatusName.PARTIALLY_DISPATCHED;
      }
      if (includes(latestStoreOrderStatuses, storeOrderStatusName.DELIVERED)) {
        newStatus = storeOrderSetStatusName.PARTIALLY_DELIVERED;
      }
    }

    if (newStatus && newStatus !== latestStoreOrderSetStatus.status) {
      // update status
      return context.storeOrderSetStatus.save({
        storeOrderSetId,
        status: newStatus,
      });
    }
    return latestStoreOrderSetStatus.id;
  }

  async save(model) {
    const saved = super.save(model);
    if (saved) {
      const { storeOrderSetId, status } = model;
      if (status === storeOrderSetStatusName.PLACED) {
        if (storeOrderSetId) {
          const allowedIsoCodeInvoice = ['SA', 'AE', 'KW'];
          const storeOrderSet = await this.context.storeOrderSet.getById(storeOrderSetId);
          const country = await this.context.country.getById(storeOrderSet?.countryId);
          if (storeOrderSet && country && allowedIsoCodeInvoice.includes(country.isoCode)) {
            await triggerInvoiceGenerator(this.context, storeOrderSetId);
          }
        }
      }
    }
    return saved;
  }
}

module.exports = StoreOrderSetStatus;
