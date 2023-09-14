const _ = require('lodash');

const {
  // customerAddressType,
  transactionAction,
  transactionType,
  orderSetRefundError,
  paymentStatusName,
  paymentStatusOrderType,
  loyaltyTransactionType,
} = require('../../root/enums');

const mapData = data => {
  data = data || [];
  return data.reduce(function (acc, x) {
    const id = acc[x.giftCardId];
    if (id) {
      id.debit += x.debit;
      id.credit += x.credit;
    } else {
      acc[x.giftCardId] = x;
    }
    return acc;
  }, {});
};

const orderSetRefund = context => async (referenceOrderId, orderType, reason) => {
  const {
    customerId,
    total,
    refunded,
    brandLocationId,
    currencyId,
    amountDue,
  } = await context.orderSet.getById(referenceOrderId);
  if (!refunded) {
    const orderItemPromises = [];
    const discoveryPromises = [];
    const orderItems = await context.orderItem.getByOrderSetId(
      referenceOrderId
    );
    const brandLocation = await context.brandLocation.getById(brandLocationId);

    // checking if some of the items are already refunded
    let itemTotal = 0.0;
    let credit = 0.0;
    if (orderItems.length > 0) {
      orderItems.forEach(orderItem => {
        if (orderItem.refundedQuantity > 0) {
          itemTotal +=
            parseFloat(orderItem.price) *
            parseFloat(orderItem.refundedQuantity);
        }
      });
    }
    // if already refunded by refunding items which is more than total
    // (not possible until there will be too much discount or something)
    credit = parseFloat(total) - parseFloat(itemTotal) - parseFloat(amountDue);
    if (credit < 0) {
      credit = 0.0;
    }

    const lTData = {
      referenceOrderId,
      orderType,
      credit,
      customerId,
      currencyId,
    };
    // if (loyaltyTransaction) {
    //   lTData.id = loyaltyTransaction.id;
    //   // add the existing credits for the same order
    //   lTData.credit = parseFloat(loyaltyTransaction.credit) + credit;
    // }
    orderItems.forEach(item => {
      orderItemPromises.push(
        context.orderItem.save({
          id: item.id,
          refundedQuantity: item.quantity,
          refunded: true,
        })
      );
    });
    orderItemPromises.push(
      context.orderSet.save({
        id: referenceOrderId,
        refunded: true,
        refundReason: reason
      })
    );

    if (credit > 0) {
      orderItemPromises.push(
        context.transaction.save({
          referenceOrderId,
          orderType: paymentStatusOrderType.ORDER_SET,
          action: transactionAction.REFUND,
          type: transactionType.CREDITED,
          customerId,
          currencyId: brandLocation.currencyId,
          amount: credit,
        })
      );
    }

    const giftCards = mapData(
      _.map(
        await context.giftCardTransaction.getByOrderId(referenceOrderId),
        tr => {
          return {
            debit: Number(tr.debit),
            credit: Number(tr.credit),
            giftCardId: tr.giftCardId,
          };
        }
      )
    );
    const giftCardIds = Object.keys(giftCards);

    if (giftCardIds.length > 0) {
      const giftCardId = giftCardIds[0];
      const debit = Number(giftCards[giftCardId].debit) || 0;
      const credit = Number(giftCards[giftCardId].credit) || 0;
      if (debit > 0) {
        let giftCardRefundAmount = 0.0;
        if (credit < debit) {
          // divide the credits we want to refund partially in gift card and
          // rest of credits will go to cofe credits
          lTData.giftCardId = giftCardId;

          giftCardRefundAmount = debit - credit;

          lTData.amount = giftCardRefundAmount;
          orderItemPromises.push(context.giftCardTransaction.credit(lTData));
          lTData.credit = Number(lTData.credit) - giftCardRefundAmount;
        }
      }
    }
    let discoveryCreditGenerate = 0;
    let discoveryCreditRedemptionId = null;
    if (Number(lTData.credit) > 0) {
      const discoveryCredit = await context.discoveryCredit.getByCustomerAndCurrencyId(
        customerId,
        currencyId
      );
      if (discoveryCredit) {
        const discoveryCreditRedemption = await context.discoveryCreditRedemption.usedByBrandAndOrder(
          discoveryCredit.id,
          brandLocation.brandId,
          referenceOrderId,
          false
        );
        if (
          discoveryCreditRedemption &&
          Number(lTData.credit) >= Number(discoveryCreditRedemption.amount)
        ) {
          lTData.credit =
            Number(lTData.credit) - Number(discoveryCreditRedemption.amount);

          discoveryCreditGenerate = Number(discoveryCreditRedemption.amount);
          discoveryCreditRedemptionId = discoveryCreditRedemption.id;
        }
      }
      orderItemPromises.push(
        context.loyaltyTransaction.credit(
          lTData.referenceOrderId,
          lTData.orderType,
          lTData.customerId,
          lTData.credit,
          lTData.currencyId
        )
      );
    }

    await Promise.all(orderItemPromises);

    if (discoveryCreditGenerate > 0 && discoveryCreditRedemptionId) {
      discoveryPromises.push(
        context.loyaltyTransaction.credit(
          lTData.referenceOrderId,
          loyaltyTransactionType.DISCOVERY_CREDITS_REFUND,
          lTData.customerId,
          discoveryCreditGenerate,
          lTData.currencyId
        )
      );
      discoveryPromises.push(
        context.discoveryCreditRedemption.save({
          id: discoveryCreditRedemptionId,
          refunded: true,
        })
      );
    }
    await Promise.all(discoveryPromises);
    await context.cSubscriptionCustomerTransaction
      .refundOrderSubscriptionUsage(referenceOrderId);
  }
};

const validateOrderSetRefund = context => async referenceOrderId => {
  const errors = [];
  const {
    customerId,
    refunded,
    creditsUsed,
    paid,
    prePaid,
  } = await context.orderSet.getById(referenceOrderId);
  if (!customerId) {
    errors.push(orderSetRefundError.INVALID_ORDER);
  }
  const statusHistory = await context.paymentStatus.getAllByOrderSetId(
    referenceOrderId
  );

  const giftCardsDebited = mapData(
    await context.giftCardTransaction.getByOrderId(referenceOrderId)
  );
  const giftCardIds = Object.keys(giftCardsDebited);

  if (refunded) {
    errors.push(orderSetRefundError.ALREADY_REFUNDED);
  }

  let paidEvenPartially = paid;

  if (giftCardIds.length > 0) {
    const giftCardId = giftCardIds[0];
    const debit = Number(giftCardsDebited[giftCardId].debit);
    if (debit > 0 && !isNaN(debit)) {
      paidEvenPartially = true;
    }
  }

  const currentStatus = _.first(statusHistory);

  if (currentStatus.name === paymentStatusName.PAYMENT_SUCCESS) {
    paidEvenPartially = true;
  }
  if (creditsUsed === true) {
    paidEvenPartially = true;
  }
  if (prePaid && prePaid.discoveryCreditUsed) {
    const { discoveryCreditUsed } = prePaid;
    if (Number(discoveryCreditUsed) > 0) {
      paidEvenPartially = true;
    }
  }

  if (!paidEvenPartially) {
    errors.push(orderSetRefundError.NOT_PAID);
  }

  return errors;
};

module.exports = { orderSetRefund, validateOrderSetRefund };
