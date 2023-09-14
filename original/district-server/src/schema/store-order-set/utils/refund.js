const _ = require('lodash');

const {
  storeOrderSetRefundError,
  paymentStatusName,
  paymentStatusOrderType,
  transactionType,
  transactionAction
} = require('../../root/enums');

const validateStoreOrderSetRefund = context => async storeOrderSetId => {
  const errors = [];
  const { customerId, refunded, paid } = await context.storeOrderSet.getById(
    storeOrderSetId
  );
  if (!customerId) {
    errors.push(storeOrderSetRefundError.INVALID_ORDER);
  }
  const statusHistory = await context.paymentStatus.getAllByStoreOrderSetId(
    storeOrderSetId
  );

  if (refunded) {
    errors.push(storeOrderSetRefundError.ALREADY_REFUNDED);
  }

  let paidEvenPartially = paid;

  const currentStatus = _.first(statusHistory);

  if (currentStatus.name === paymentStatusName.PAYMENT_SUCCESS) {
    paidEvenPartially = true;
  }

  if (!paidEvenPartially) {
    errors.push(storeOrderSetRefundError.NOT_PAID);
  }

  return errors;
};

const storeOrderSetRefund = context => async storeOrderSetId => {
  const { refunded, customerId, currencyId } = await context.storeOrderSet.getById(storeOrderSetId);
  if (!refunded) {
    const orderType = 'STORE_ORDER_SET';
    const storeOrderProductPromises = [];

    const storeOrders = await context.storeOrder.getAllByStoreOrderSet(
      storeOrderSetId
    );
    const storeOrderIds = _.map(storeOrders, 'id');

    const storeOrderProductsDB = await context.storeOrderProduct.getAllByStoreOrderIds(
      storeOrderIds
    );

    const storeOrderProducts = storeOrderProductsDB.flat();

    const lTData = {
      referenceOrderId: storeOrderSetId,
      orderType,
      credit: 0.0,
      customerId,
      currencyId,
    };
    let newCredits = 0.0;
    let tempCredits = 0.0;
    const calculateItemPrice = (p, q) => {
      return parseFloat(p) * parseFloat(q);
    };

    storeOrderProducts.forEach(item => {
      const remainingQuantity =
          parseFloat(item.quantity) - parseFloat(item.refundedQuantity);
      if (remainingQuantity > 0) {
        tempCredits = calculateItemPrice(
          parseFloat(item.price),
          remainingQuantity
        );
        newCredits += tempCredits;
        lTData.credit += tempCredits;
      }
      storeOrderProductPromises.push(
        context.storeOrderProduct.save({
          id: item.id,
          refundedQuantity: item.quantity,
          refunded: true,
        })
      );
    });
    if (Number(lTData.credit) > 0) {
      storeOrderProductPromises.push(
        context.loyaltyTransaction.credit(
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
        context.transaction.save({
          referenceOrderId: storeOrderSetId,
          orderType: paymentStatusOrderType.STORE_ORDER_SET,
          action: transactionAction.REFUND,
          type: transactionType.CREDITED,
          customerId,
          currencyId,
          amount: newCredits,
        })
      );
    }
    storeOrderProductPromises.push(
      context.storeOrderSet.save({
        id: storeOrderSetId,
        refunded: true,
      })
    );
    await Promise.all(storeOrderProductPromises);
  }
};

module.exports = { storeOrderSetRefund, validateStoreOrderSetRefund };
