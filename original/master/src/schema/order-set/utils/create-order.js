const _ = require('lodash');

const { order: orderConfig } = require('../../../../config');
const Money = require('../../../lib/currency');
const { cloneObject, generateShortCode, now } = require('../../../lib/util');
const {
  orderTypes,
  paymentStatusOrderType,
  loyaltyTransactionType,
  couponDetailUsedOn,
  rewardTierPerkType,
  orderSetStatusNames,
  paymentStatusName,
  orderSetError,
  transactionAction,
  transactionType,
} = require('../../root/enums');
const { orderFulfillmentTypes } = require('../enums');
const {
  paymentSchemes,
  paymentProviders,
} = require('../../../payment-service/enums');
const getItemsPrice = require('./get-items-price');
const calculatePrice = require('./calculate-price');
const moment = require('moment');

const saveMenuItems = context => async (
  { items, brandLocationId },
  orderSetId,
  consumedPerks
) => {
  let freeDrinks = 0;
  let freeFood = 0;
  const perkDiscounts = [];
  let totalQuantity = 0;
  let couponDiscount = 0;
  let couponPerQuantity = 0;
  const currency = await context.brandLocation.getCurrency(brandLocationId);
  // find the total number of quantities
  items.forEach(i => {
    totalQuantity += parseFloat(i.quantity);
  });
  consumedPerks.forEach(p => {
    switch (p.type) {
      case rewardTierPerkType.FREE_DRINK:
        freeDrinks += p.quantity;
        break;
      case rewardTierPerkType.FREE_FOOD:
        freeFood += p.quantity;
        break;
      case rewardTierPerkType.DISCOUNT:
        perkDiscounts.push(p.tierDiscountMultiplier);
        break;
      case 'COUPON':
        couponDiscount += parseFloat(p.value);
        break;
      default:
        break;
    }
  });
  totalQuantity = totalQuantity - freeDrinks - freeFood;
  couponPerQuantity = new Money(
    couponDiscount / totalQuantity,
    currency.decimalPlace,
    currency.lowestDenomination
  ).round();
  items = _.sortBy(items, [i => i.price]);
  const itemPromise = items.map(async item => {
    item.freeQuantity = 0;

    if (item.type === 'DRINK' && freeDrinks > 0) {
      if (parseFloat(item.quantity) <= freeDrinks) {
        item.freeQuantity = parseFloat(item.quantity);
        freeDrinks -= parseFloat(item.quantity);
      } else if (parseFloat(item.quantity) > freeDrinks) {
        item.freeQuantity = freeDrinks;
        freeDrinks = 0;
      }
    }
    if (item.type === 'FOOD' && freeFood > 0) {
      if (parseFloat(item.quantity) <= freeFood) {
        item.freeQuantity = parseFloat(item.quantity);
        freeFood -= parseFloat(item.quantity);
      } else if (parseFloat(item.quantity) > freeFood) {
        item.freeQuantity = freeFood;
        freeFood = 0;
      }
    }
    // if all quantities are free then there will be no discount applied on any quantity of the item.
    if (item.freeQuantity === parseFloat(item.quantity)) {
      item.couponPerQuantity = 0;
    } else {
      item.couponPerQuantity = couponPerQuantity.value;
    }
    if (perkDiscounts.length > 0) {
      item.perkDiscountMultiplier = perkDiscounts.reduce((a, b) => a * b);
    } else {
      item.perkDiscountMultiplier = 1;
    }

    const menuItem = await context.menuItem.getById(item.itemId);
    return {
      ..._.omit(item, 'itemId'),
      orderSetId,
      menuItemId: item.itemId,
      name: menuItem.name,
      nameAr: menuItem.nameAr,
      nameTr: menuItem.nameTr,
      photo: menuItem.photo,
    };
  });
  const saveItems = await Promise.all(itemPromise);
  await context.orderItem.save(saveItems);
};

const saveDeliveryAddress = context => async (
  { fulfillment },
  orderFulfillmentId
) => {
  const customerAddress = await context.customerAddress.getById(fulfillment.id);

  const neighborhood = await context.neighborhood.getById(
    customerAddress.neighborhoodId
  );

  const fieldsFromCustomerAddress = _.pick(customerAddress, [
    'geolocation',
    'note',
    'friendlyName',
    'block',
    'street',
    'avenue',
    'streetNumber',
    'type',
    'floor',
    'unitNumber',
    'city',
    'countryCode',
    'dynamicData',
  ]);

  const deliveryAddress = {
    ...fieldsFromCustomerAddress,
    orderFulfillmentId,
    neighborhoodName: neighborhood ? neighborhood.name : null,
    neighborhoodId: neighborhood ? neighborhood.id : null,
    countryCode: customerAddress.countryCode,
  };

  return context.deliveryAddress.save(deliveryAddress);
};

const debitGiftCardTransaction = async (
  context,
  { giftCardId, orderSetId, orderType, customerId, amount, currencyId }
) => {
  await context.giftCardTransaction.debit({
    giftCardId,
    referenceOrderId: orderSetId,
    orderType,
    customerId,
    amount: Number(amount),
    currencyId,
  });
};

// const creditGiftCardTransaction = async (
//   context,
//   { giftCardId, orderSetId, orderType, customerId, amount, currencyId }
// ) => {
//   await context.giftCardTransaction.credit({
//     giftCardId,
//     referenceOrderId: orderSetId,
//     orderType,
//     customerId,
//     amount: Number(amount),
//     currencyId,
//   });
// };

const debitTransaction = async (
  context,
  { orderSetId, paymentStatusOrderType, customerId, amount, currencyId }
) => {
  await context.loyaltyTransaction.debit(
    orderSetId,
    paymentStatusOrderType,
    customerId,
    Number(amount),
    currencyId
  );
};

const creditTransaction = async (
  context,
  { orderSetId, paymentStatusOrderType, customerId, amount, currencyId }
) => {
  await context.loyaltyTransaction.credit(
    orderSetId,
    paymentStatusOrderType,
    customerId,
    Number(amount),
    currencyId
  );
};

const getPrePaid = (
  creditsUsed,
  giftCardCreditsUsed,
  giftCardIds,
  discoveryCreditUsed
) => {
  let prePaid = null;
  if (
    Number(creditsUsed) > 0 ||
    Number(giftCardCreditsUsed) > 0 ||
    Number(discoveryCreditUsed) > 0
  ) {
    prePaid = {};
    if (Number(creditsUsed) > 0) {
      prePaid.creditsUsed = Number(creditsUsed);
    }
    if (Number(giftCardCreditsUsed) > 0) {
      prePaid.giftCards = [{ id: giftCardIds[0], value: giftCardCreditsUsed }];
    }
    if (Number(discoveryCreditUsed) > 0) {
      prePaid.discoveryCreditUsed = Number(discoveryCreditUsed);
    }
  }
  return prePaid;
};

const transaction = async (
  context,
  { orderSetId, orderType, customerId, action, type, amount, currencyId }
) => {
  await context.transaction.save({
    referenceOrderId: orderSetId,
    orderType,
    action,
    type,
    customerId,
    currencyId,
    amount: Number(amount),
  });
};

// eslint-disable-next-line complexity
const createOrder = context => async input => {
  const { fulfillment, paymentMethod } = input;
  const orderType =
    fulfillment.type === orderFulfillmentTypes.DELIVERY
      ? orderTypes.DELIVERY
      : fulfillment.type === orderFulfillmentTypes.EXPRESS_DELIVERY
        ? orderTypes.EXPRESS_DELIVERY
        : orderTypes.PICKUP;

  const deliverToVehicle = fulfillment.type === orderFulfillmentTypes.CAR;
  let vehicleId;
  let vehicleColor;
  let vehicleDescription;
  let vehiclePlateNumber;
  if (deliverToVehicle) {
    const customerCar = await context.customerCar.getById(fulfillment.id);
    vehicleId = fulfillment.id;
    vehicleColor = customerCar.color;
    vehicleDescription = customerCar.brand;
    vehiclePlateNumber = customerCar.plateNumber;
  }

  let orderSet = _.pick(input, [
    'customerId',
    'brandLocationId',
    'note',
    'couponId',
    'src',
    'srcPlatform',
    'srcPlatformVersion',
  ]);

  let delivery = null;
  if (
    orderType === orderTypes.DELIVERY ||
    orderType === orderTypes.EXPRESS_DELIVERY
  ) {
    delivery = await context.orderSet.getAddress(input);
  }

  if (
    (await context.orderSet.sendRevelOrder(
      input.items,
      orderSet,
      false,
      delivery,
      true
    )) === false
  )
    return {
      error: [orderSetError.POS_INITIALIZATION_ERROR],
    };

  const brandLocation = await context.brandLocation.getById(
    orderSet.brandLocationId
  );

  const orderFulfillment = {
    type: fulfillment.type,
    time: brandLocation
      ? moment(now.get()).tz(brandLocation.timeZoneIdentifier)
      : moment(now.get()),

    deliverToVehicle,
    vehicleId,
    vehicleColor,
    vehicleDescription,
    vehiclePlateNumber,
    note: '',
  };

  input = await getItemsPrice(context)(input);
  Object.assign(orderSet, await calculatePrice(context)(input, orderType));
  let { consumedPerks } = orderSet;
  const { creditsUsed } = orderSet;
  const { discoveryCreditUsed } = orderSet;
  const { giftCardCreditsUsed } = orderSet;

  // true if useCredits is true and credit used are greater than 0
  const useCredits =
    _.get(input, 'useCredits', false) === false
      ? false
      : Number(creditsUsed) > 0;

  const giftCardIds = _.get(input, 'giftCardIds', []);
  orderSet = _.omit(orderSet, [
    'consumedPerks',
    'currency',
    'originalFee',
    'creditsUsed',
    'giftCardIds',
    'giftCardCreditsUsed',
    'discoveryCreditUsed',
  ]);

  let customerCardTokenSnapshot = null;

  const {
    paymentProvider,
    customerCardToken,
  } = await context.paymentService.detectPaymentProviderViaPaymentMethod(
    paymentMethod
  );
  console.log('Detected Payment Provider : ', {
    paymentProvider,
    customerCardToken,
  });
  if (customerCardToken) {
    customerCardTokenSnapshot = cloneObject(customerCardToken);
    delete customerCardTokenSnapshot.providerRaw;
  }

  const getUniqueShortCode = async () => {
    const shortCode = generateShortCode();
    const [orderSet] = await context.orderSet.getByShortCode(shortCode);
    if (!orderSet) {
      return shortCode;
    }
    return getUniqueShortCode();
  };

  const shortCode = await getUniqueShortCode();
  const orderSetId = await context.orderSet.save({
    ...orderSet,
    shortCode,
    creditsUsed: useCredits,
    // Allow cash on delivery to be true only if there's amount due and payment method is cash.
    cashOnDelivery:
      paymentMethod &&
      paymentMethod.paymentScheme === paymentSchemes.CASH &&
      Number(orderSet.amountDue) > 0,
    paymentMethod:
      paymentMethod && Number(orderSet.amountDue) > 0
        ? paymentMethod.paymentScheme || null
        : null,
    paymentProvider,
    receiptUrl: orderConfig.receiptUrl,
    errorUrl: orderConfig.errorUrl,
  });

  orderSet.id = orderSetId;
  // save used coupon detail
  if (orderSet.couponId) {
    const couponDetail = await context.couponDetail.getCostReductionCouponDetail(
      orderSet.couponId
    );
    const usedCouponDetails = [];
    if (couponDetail) {
      usedCouponDetails.push({
        usedOn: couponDetailUsedOn.ORDER_SET,
        referenceId: orderSet.id,
        couponId: orderSet.couponId,
        type: couponDetail.type,
        amount: couponDetail.amount,
      });
    }
    const usedPerksCouponDetails =
      _.filter(consumedPerks, cp => cp.coupon) || [];
    usedPerksCouponDetails.map(usedPerksCouponDetail => {
      usedCouponDetails.push({
        usedOn: couponDetailUsedOn.ORDER_SET,
        referenceId: orderSet.id,
        couponId: orderSet.couponId,
        type: usedPerksCouponDetail.type,
        amount: usedPerksCouponDetail.quantity,
      });
      return usedPerksCouponDetail;
    });

    if (usedCouponDetails.length > 0) {
      await context.usedCouponDetail.save(usedCouponDetails);
    }
  }

  await saveMenuItems(context)(input, orderSetId, consumedPerks);
  // remove coupon as it's not part of the perks
  consumedPerks = _.filter(consumedPerks, cp => {
    return !cp.coupon;
  });
  consumedPerks = _.filter(consumedPerks, o => {
    return o.type !== 'COUPON' && !o.coupon;
  });

  const orderFulfillmentId = await context.orderFulfillment.save({
    ...orderFulfillment,
    orderSetId,
  });

  if (
    fulfillment.type === orderFulfillmentTypes.DELIVERY ||
    fulfillment.type === orderFulfillmentTypes.EXPRESS_DELIVERY
  ) {
    await saveDeliveryAddress(context)(input, orderFulfillmentId);
  }

  const orderSetTotal = _.get(orderSet, 'total', 0);

  let orderSetStatusName = orderSetStatusNames.INITIATED;

  let paymentStatus = paymentStatusName.PAYMENT_PENDING;
  let paymentUrl = null;
  let paymentRawResponse = '{}';
  let usedPerksStatus = 0;

  const customer = await context.customer.getById(orderSet.customerId);
  const currency = await context.brandLocation.getCurrency(
    orderSet.brandLocationId
  );
  const country = await context.brandLocation.getCountry(
    orderSet.brandLocationId
  );

  // Order payment method object (we will save only if we use payment method)
  const orderPaymentMethodInput = {
    orderType: paymentStatusOrderType.ORDER_SET,
    referenceOrderId: orderSetId,
    paymentProvider,
    paymentMethod: paymentMethod || {},
    customerCardTokenSnapshot,
  };

  let posOrderId = null;
  let debitCreditsAndGiftCardNow = false;
  // allow only if if still needs to be paid
  if (
    paymentProvider === paymentProviders.INTERNAL &&
    Number(orderSet.amountDue) > 0
  ) {
    posOrderId = await context.orderSet.sendRevelOrder(
      input.items,
      orderSet,
      paymentMethod.paymentScheme !== paymentSchemes.CASH,
      delivery,
      false
    );
    if (posOrderId === false) {
      console.log('MERCHANT_INITIALIZATION_ERROR: posOrderId is failed');
      return {
        error: [orderSetError.MERCHANT_INITIALIZATION_ERROR],
      };
    }

    // cash
    debitCreditsAndGiftCardNow = true;

    orderSetStatusName = orderSetStatusNames.PLACED;
    if (paymentMethod.paymentScheme === paymentSchemes.CASH) {
      paymentStatus = paymentStatusName.PAYMENT_PENDING;
      usedPerksStatus = 1;
      paymentRawResponse = '{"isCash": true, "paid": false}';
    }

    await context.customerStats.increment(orderSet.customerId, {
      totalKdSpent: Number(orderSetTotal),
      // there will only ever be one order per order set and after a
      // later refactor there will only be one entity and no more of
      // this bullshit.
      totalOrders: 1,
    });
    // we will save only if we use payment method
    await context.orderPaymentMethod.save(orderPaymentMethodInput);
  } else if (Number(orderSet.amountDue) > 0) {
    // await context.orderSet.save({
    //   id: orderSet.id,
    //   amountDue: Number(orderSet.total),
    // });
    // allow if still needs to be paid after credits and giftcard
    const psResponse = await context.paymentService.pay({
      language: customer.preferedLanguage,
      currencyCode: currency.isoCode,
      countryCode: country.isoCode,
      amount: Number(orderSet.amountDue),
      creditsUsed: Number(creditsUsed),
      giftCardCreditsUsed: Number(giftCardCreditsUsed),
      discoveryCreditUsed: Number(discoveryCreditUsed),
      paymentMethod,
      referenceOrderId: orderSet.id,
      orderType: paymentStatusOrderType.ORDER_SET,
      customerId: customer.id,
      customerPhoneNumber: customer.phoneNumber,
    });

    if (psResponse.error) {
      paymentStatus = paymentStatusName.PAYMENT_FAILURE;

      // // if credits are used
      // if (Number(creditsUsed) > 0) {
      //   creditTransaction(context, {
      //     orderSetId,
      //     paymentStatusOrderType: paymentStatusOrderType.ORDER_SET,
      //     customerId: orderSet.customerId,
      //     amount: creditsUsed,
      //     currencyId: orderSet.currencyId,
      //   });
      // }
      // // if gift card was used
      // if (Number(giftCardCreditsUsed) > 0) {
      //   creditGiftCardTransaction(context, {
      //     giftCardId: giftCardIds[0],
      //     orderSetId,
      //     orderType: paymentStatusOrderType.ORDER_SET,
      //     customerId: orderSet.customerId,
      //     amount: Number(giftCardCreditsUsed),
      //     currencyId: orderSet.currencyId,
      //   });
      // }
      // if (Number(creditsUsed) > 0 || Number(giftCardCreditsUsed) > 0) {
      //   await context.orderSet.save({
      //     id: orderSetId,
      //     refunded: true,
      //     amountDue: Number(orderSet.total),
      //   });
      // }

      await context.paymentStatus.save({
        referenceOrderId: orderSet.id,
        orderType: paymentStatusOrderType.ORDER_SET,
        name: paymentStatus,
        rawResponse: psResponse.error,
      });
      console.log(
        'MERCHANT_INITIALIZATION_ERROR: psResponse.error',
        psResponse.error
      );

      return {
        error: [orderSetError.MERCHANT_INITIALIZATION_ERROR],
      };
    }

    await context.orderSet.save({
      id: orderSet.id,
      merchantId: psResponse.id,
    });
    paymentUrl = psResponse.paymentUrl;
    paymentRawResponse = psResponse.rawResponse;
    if (psResponse.approved) {
      posOrderId = await context.orderSet.sendRevelOrder(
        input.items,
        orderSet,
        true,
        delivery,
        false
      );
      if (posOrderId === false) {
        return {
          error: [orderSetError.POS_INITIALIZATION_ERROR],
        };
      }
      paymentStatus = paymentStatusName.PAYMENT_SUCCESS;
      debitCreditsAndGiftCardNow = true;
    }
    // we will save only if we use payment method
    await context.orderPaymentMethod.save(orderPaymentMethodInput);
  } else {
    posOrderId = await context.orderSet.sendRevelOrder(
      input.items,
      orderSet,
      true,
      delivery,
      false
    );
    if (posOrderId === false) {
      console.log('MERCHANT_INITIALIZATION_ERROR: posOrderId2 is failed');
      return {
        error: [orderSetError.MERCHANT_INITIALIZATION_ERROR],
      };
    }

    debitCreditsAndGiftCardNow = true;
    paymentStatus = paymentStatusName.PAYMENT_SUCCESS;
    paymentUrl = null;
    paymentRawResponse = `{"orderSetTotal": ${orderSetTotal}}`;
  }

  // store prepaid credits and giftcards
  await context.orderSet.save({
    id: orderSet.id,
    prePaid: getPrePaid(
      creditsUsed,
      giftCardCreditsUsed,
      giftCardIds,
      discoveryCreditUsed
    ),
  });

  // debit credits or gift card now if any
  if (debitCreditsAndGiftCardNow) {
    // if discovery credit are used
    if (Number(discoveryCreditUsed) > 0) {
      await debitTransaction(context, {
        orderSetId,
        paymentStatusOrderType: loyaltyTransactionType.DISCOVERY_CREDITS,
        customerId: orderSet.customerId,
        amount: discoveryCreditUsed,
        currencyId: orderSet.currencyId,
      });
    }
    // if credits are used
    if (Number(creditsUsed) > 0) {
      await debitTransaction(context, {
        orderSetId,
        paymentStatusOrderType: paymentStatusOrderType.ORDER_SET,
        customerId: orderSet.customerId,
        amount: creditsUsed,
        currencyId: orderSet.currencyId,
      });
    }
    // if gift card was used
    if (Number(giftCardCreditsUsed) > 0) {
      await debitGiftCardTransaction(context, {
        giftCardId: giftCardIds[0],
        orderSetId,
        orderType: paymentStatusOrderType.ORDER_SET,
        customerId: orderSet.customerId,
        amount: Number(giftCardCreditsUsed),
        currencyId: orderSet.currencyId,
      });
    }

    // add payment transaction if paid by credits or gift card
    if (Number(orderSet.total) - Number(orderSet.amountDue) > 0) {
      await transaction(context, {
        orderSetId,
        orderType: paymentStatusOrderType.ORDER_SET,
        action: transactionAction.ORDER,
        type: transactionType.DEBITED,
        customerId: orderSet.customerId,
        currencyId: brandLocation.currencyId,
        amount: Number(orderSet.total) - Number(orderSet.amountDue),
      });
    }
  }

  // add used perks
  await context.customerUsedPerk.addPerks(
    orderSetId,
    consumedPerks,
    usedPerksStatus
  );

  await context.orderSetStatus.setStatusForOrderSetId(
    orderSetId,
    orderSetStatusName,
    context
  );
  // Insert Initial Payment Status
  await context.paymentStatus.save({
    referenceOrderId: orderSetId,
    orderType: paymentStatusOrderType.ORDER_SET,
    name: paymentStatus,
    rawResponse: paymentRawResponse,
  });
  // checklist
  // - payment is succussful
  // - coupon is appied.
  // - coupon is cashback
  // - credit back the coupon amount as cashback
  if (
    paymentStatus === paymentStatusName.PAYMENT_SUCCESS &&
    orderSet.isCashbackCoupon &&
    orderSet.couponAmount > 0
  ) {
    await creditTransaction(context, {
      orderSetId,
      paymentStatusOrderType: loyaltyTransactionType.CASHBACK,
      customerId: orderSet.customerId,
      amount: orderSet.couponAmount,
      currencyId: orderSet.currencyId,
    });
  }

  return { paymentUrl, orderSetId, paymentStatus, paymentMethod };
};

module.exports = { createOrder };
