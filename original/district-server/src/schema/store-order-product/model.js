const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const {
  storeOrderProductsRefundError,
  paymentStatusOrderType,
  transactionType,
  transactionAction,
  paymentStatusName,
} = require('../root/enums');
const { find, first, map } = require('lodash');

class StoreOrderProduct extends BaseModel {
  constructor(db, context) {
    super(db, 'store_order_products', context);
    this.loaders = createLoaders(this);
  }

  async getAllByStoreOrder(storeOrderId) {
    return this.loaders.byStoreOrder.load(storeOrderId);
  }

  async getAllByStoreOrderIds(storeOrderId) {
    return this.loaders.byStoreOrder.loadMany(storeOrderId);
  }

  getCurrency(storeOrderProductId) {
    return this.loaders.currency.load(storeOrderProductId);
  }

  async validateStoreOrderProductsRefund(
    storeOrderSetId,
    storeOrderItems,
    storeOrderIds
  ) {
    const errors = [];
    const { customerId, refunded } = await this.context.storeOrderSet.getById(
      storeOrderSetId
    );
    if (!customerId) {
      errors.push(storeOrderProductsRefundError.INVALID_ORDER);
    }
    const statusHistory = await this.context.paymentStatus.getAllByStoreOrderSetId(
      storeOrderSetId
    );
    const currentStatus = first(statusHistory);
    if (currentStatus.name !== paymentStatusName.PAYMENT_SUCCESS) {
      errors.push(storeOrderProductsRefundError.NOT_PAID);
    }
    if (refunded) {
      errors.push(storeOrderProductsRefundError.ALREADY_REFUNDED);
    }
    // find all order items
    const storeOrderItemsDB = await this.context.storeOrderProduct.getAllByStoreOrderIds(
      storeOrderIds
    );
    const storeOrderItemsDBArray = storeOrderItemsDB.flat();
    let item;
    storeOrderItems.forEach(storeOrderProduct => {
      item = find(storeOrderItemsDBArray, o => {
        return o.id === storeOrderProduct.id;
      });
      // remaining quantity
      const remainingQuantity =
        parseFloat(item.quantity) - parseFloat(item.refundedQuantity);
      // if quantity is valid and item is not already refunded.
      if (parseFloat(storeOrderProduct.quantity) > remainingQuantity) {
        errors.push(storeOrderProductsRefundError.INVALID_QUANTITY);
      }
      if (item.refunded) {
        errors.push(storeOrderProductsRefundError.ALREADY_REFUNDED);
      }
    });
    return errors;
  }

  async storeOrderProductsRefund(storeOrderSetId, storeOrderItems) {
    const orderType = 'STORE_ORDER_SET';
    const { customerId, currencyId } = await this.context.storeOrderSet.getById(
      storeOrderSetId
    );
    const storeOrderProductPromises = [];
    let totalRefunded = 0;
    const storeOrders = await this.context.storeOrder.getAllByStoreOrderSet(
      storeOrderSetId
    );
    const storeOrder = first(storeOrders);
    const brandCurrency = await this.context.brand.getCurrency(
      storeOrder.brandId
    );

    const calculateItemPrice = (p, q) => {
      return parseFloat(p) * parseFloat(q);
    };

    // initialize loyalty transaction data
    const lTData = {
      referenceOrderId: storeOrderSetId,
      orderType,
      credit: 0.0,
      customerId,
      currencyId,
    };
    let newCredits = 0.0;
    let tempCredits = 0.0;

    const allStoreOrderIds = map(storeOrders, 'id');

    // find all order items
    const storeOrderItemsDB = await this.context.storeOrderProduct.getAllByStoreOrderIds(
      allStoreOrderIds
    );
    const storeOrderItemsDBArray = storeOrderItemsDB.flat();

    // calculate already refunded credits
    if (storeOrderItems.length > 0) {
      let item;
      storeOrderItems.forEach(storeOrderProduct => {
        item = find(storeOrderItemsDBArray, o => {
          return o.id === storeOrderProduct.id;
        });
        // remaining quantity
        const remainingQuantity =
          parseFloat(item.quantity) - parseFloat(item.refundedQuantity);
        // if quantity is valid and item is not already refunded.
        if (parseFloat(storeOrderProduct.quantity) <= remainingQuantity) {
          let quantitytoBePaidActual = parseFloat(storeOrderProduct.quantity);

          // currently store orders does not accept cofe credits

          if (quantitytoBePaidActual < 0) {
            quantitytoBePaidActual *= -1;
          }
          tempCredits = calculateItemPrice(
            parseFloat(item.price),
            quantitytoBePaidActual
          );
          newCredits += tempCredits;
          lTData.credit += tempCredits;
          const refunded =
            parseFloat(storeOrderProduct.quantity) === remainingQuantity;
          storeOrderProductPromises.push(
            this.context.storeOrderProduct.save({
              id: item.id,
              refunded,
              refundedQuantity:
                parseFloat(item.refundedQuantity) +
                parseFloat(storeOrderProduct.quantity),
            })
          );
          if (parseFloat(storeOrderProduct.quantity) === remainingQuantity)
            totalRefunded++;
        }
      });
    }
    storeOrderItemsDBArray.forEach(storeOrderProduct => {
      if (
        parseFloat(storeOrderProduct.quantity) ===
        storeOrderProduct.refundedQuantity
      ) {
        totalRefunded++;
      }
    });
    // if the number of refunded products equals to the number of products in the set, this function acts like storeOrderSetRefund
    // so we don't define any credit, refunding handles manually

    if (totalRefunded === storeOrderItemsDBArray.length) {
      // lTData.credit += parseFloat(fee);
      storeOrderProductPromises.push(
        this.context.storeOrderSet.save({ id: storeOrderSetId, refunded: true })
      );
      // newCredits += parseFloat(fee);
    }
    // gift card is not accepted by store orders

    if (Number(lTData.credit) > 0) {
      storeOrderProductPromises.push(
        this.context.loyaltyTransaction.credit(
          lTData.referenceOrderId,
          lTData.orderType,
          lTData.customerId,
          lTData.credit,
          lTData.currencyId
        )
      );
    }

    if (newCredits > 0) {
      storeOrderProductPromises.push(
        this.context.transaction.save({
          referenceOrderId: storeOrderSetId,
          orderType: paymentStatusOrderType.STORE_ORDER_SET,
          action: transactionAction.REFUND,
          type: transactionType.CREDITED,
          customerId,
          currencyId: brandCurrency.id,
          amount: newCredits,
        })
      );
    }
    await Promise.all(storeOrderProductPromises);
  }
}

module.exports = StoreOrderProduct;
