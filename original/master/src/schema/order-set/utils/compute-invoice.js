const { pick } = require('lodash');
const KD = require('../../../lib/currency');
const {
  addLocalizationField,
  isBuildBefore,
  isAndroid,
  isIOS,
} = require('../../../lib/util');
const { isProd } = require('../../../../config');

const { invoiceComponentType } = require('../../root/enums');
const getItemsPrice = require('./get-items-price');
const calculatePrice = require('./calculate-price');

// eslint-disable-next-line complexity
const computeInvoice = context => async input => {
  const orderSet = pick(input, [
    'customerId',
    'brandLocationId',
    'couponId',
    'fulfillment',
    'useCredits',
    'giftCardIds',
  ]);

  const { srcPlatform, srcPlatformVersion } = input;

  orderSet.useCredits = orderSet.useCredits ? orderSet.useCredits : false;
  // input.items = map(input.items, i => {
  //   map(i.selectedOptions, o => {})
  // });

  input = await getItemsPrice(context)(input);
  Object.assign(
    orderSet,
    await calculatePrice(context)(input, orderSet.fulfillment.type)
  );

  // const rewardDiscountApplied = find(orderSet.consumedPerks, cp => {
  //   return (
  //     cp.type === rewardTierPerkType.DISCOUNT && cp.tierDiscountMultiplier
  //   );
  // });

  // console.log('orderSet', orderSet);

  const components = [
    {
      type: invoiceComponentType.TOTAL,
      value: new KD(
        orderSet.total,
        orderSet.currency.decimalPlace,
        orderSet.currency.lowestDenomination
      ).round(),
    },
    {
      type: invoiceComponentType.SUBTOTAL,
      value: new KD(
        orderSet.subtotal,
        orderSet.currency.decimalPlace,
        orderSet.currency.lowestDenomination
      ).round(),
    },
    {
      type: invoiceComponentType.AMOUNT_DUE,
      value: new KD(
        orderSet.amountDue,
        orderSet.currency.decimalPlace,
        orderSet.currency.lowestDenomination
      ).round(),
    },
  ];
  if (
    parseFloat(orderSet.fee) > 0 ||
    parseFloat(orderSet.originalFee) !== parseFloat(orderSet.fee)
  ) {
    components.push({
      type: invoiceComponentType.SERVICE_FEE,
      value: new KD(
        orderSet.fee,
        orderSet.currency.decimalPlace,
        orderSet.currency.lowestDenomination
      ).round(),
    });
  }
  if (parseFloat(orderSet.couponAmount) > 0 || orderSet.couponId) {
    let couponType = orderSet.isCashbackCoupon
      ? invoiceComponentType.CASHBACK
      : invoiceComponentType.VOUCHER;

    // TODO: we will remove this check when 22 march,2021 campaign is over or close  to 100% customers  have adapted 6.2.0.0.0 or 5.7.14
    if (couponType === invoiceComponentType.CASHBACK) {
      if (
        isProd &&
        ((isAndroid(srcPlatform) &&
          isBuildBefore(srcPlatformVersion, '6.2.0.0.0')) ||
          (isIOS(srcPlatform) &&
            isBuildBefore(
              srcPlatformVersion ? srcPlatformVersion.substring(0, 6) : null,
              '5.7.14'
            )))
      ) {
        couponType = invoiceComponentType.VOUCHER;
      }
    }

    components.push({
      type: couponType,
      value: new KD(
        orderSet.couponAmount,
        orderSet.currency.decimalPlace,
        orderSet.currency.lowestDenomination
      ).round(),
    });
  }
  if (parseFloat(orderSet.rewardAmount) > 0) {
    components.push({
      type: invoiceComponentType.REWARD_DISCOUNT,
      value: new KD(
        orderSet.rewardAmount,
        orderSet.currency.decimalPlace,
        orderSet.currency.lowestDenomination
      ).round(),
    });
  }
  if (orderSet.useCredits && Number(orderSet.creditsUsed) > 0) {
    components.push({
      type: invoiceComponentType.CREDITS,
      value: new KD(
        orderSet.creditsUsed,
        orderSet.currency.decimalPlace,
        orderSet.currency.lowestDenomination
      ).round(),
    });
  }
  if (
    orderSet.discoveryCreditUsed &&
    Number(orderSet.discoveryCreditUsed) > 0
  ) {
    components.push({
      type: invoiceComponentType.DISCOVERY_CREDITS,
      value: new KD(
        orderSet.discoveryCreditUsed,
        orderSet.currency.decimalPlace,
        orderSet.currency.lowestDenomination
      ).round(),
    });
  }
  if (
    orderSet.giftCardIds &&
    orderSet.giftCardIds.length > 0 &&
    Number(orderSet.giftCardCreditsUsed) > 0
  ) {
    components.push({
      type: invoiceComponentType.GIFT_CARD,
      value: new KD(
        orderSet.giftCardCreditsUsed,
        orderSet.currency.decimalPlace,
        orderSet.currency.lowestDenomination
      ).round(),
    });
  }

  return {
    components,
    currency: addLocalizationField(
      addLocalizationField(orderSet.currency, 'symbol'),
      'subunitName'
    ),
    // vat: orderSet.vat,
    // totalVat: orderSet.totalVat,
  };
};

module.exports = { computeInvoice };
