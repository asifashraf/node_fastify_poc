const _ = require('lodash');

const {
  menuItemType,
  rewardStatus,
  rewardTierPerkApplyType,
  rewardTierPerkType,
  orderTypes,
  promoType,
} = require('../../root/enums');
const { consumePerk, cloneObject } = require('../../../lib/util');
const Money = require('../../../lib/currency');

const calculateCredit = (customerBalance, total) => {
  let credits = 0.0;
  // Validate that the customer has enought credit
  if (Number(customerBalance) < Number(total)) {
    credits = Number(customerBalance);
  } else {
    credits = Number(total);
  }
  return credits;
};

const calculateAmountDue = (customerBalance, total) => {
  let amountDue = total;
  if (Number(customerBalance) < Number(total)) {
    amountDue = Number(total) - Number(customerBalance);
  } else {
    amountDue = 0.0;
  }

  return amountDue;
};

const calculateGCCredit = (gcBalance, due) => {
  let credits = 0.0;
  // Validate that the customer has enought credit
  if (Number(gcBalance) < Number(due)) {
    credits = Number(gcBalance);
  } else {
    credits = Number(due);
  }
  return credits;
};

const calculateGCAmountDue = (gcBalance, due) => {
  let amountDue = due;
  if (Number(gcBalance) < Number(due)) {
    amountDue = Number(due) - Number(gcBalance);
  } else {
    amountDue = 0.0;
  }

  return amountDue;
};

// eslint-disable-next-line complexity
const calculatePrice = context => async (
  {
    items,
    couponId,
    customerId,
    brandLocationId,
    usePerks,
    useCredits = false,
    giftCardIds = [],
  },
  orderType
) => {
  // perks to be consumed ONGOING/OTHER TYPES
  const consumedPerks = [];
  const {
    serviceFee,
    deliveryFee,
    expressDeliveryFee,
    vat,
  } = await context.brandLocation.getFeesAndVat(brandLocationId);
  let perks = usePerks ? cloneObject(usePerks) : [];
  const currency = await context.brandLocation.getCurrency(brandLocationId);
  let coupon;
  if (couponId) {
    coupon = await context.coupon.getById(couponId);
    const freePerksCouponDetails = await context.couponDetail.getFreePerksCouponDetails(
      couponId
    );
    freePerksCouponDetails.map(freePerksCouponDetail => {
      perks.push({
        type: freePerksCouponDetail.type,
        quantity: parseInt(freePerksCouponDetail.amount, 10),
        coupon: true,
      });
      return freePerksCouponDetails;
    });
  }

  // reward ongoing perks

  let tierDiscountMultiplier = 1;

  const brandLocation = await context.brandLocation.getById(brandLocationId);

  if (brandLocation) {
    const reward = _.first(
      await context.reward
        .getByBrandId(brandLocation.brandId)
        .where('status', rewardStatus.ACTIVE)
    );

    if (reward) {
      const lastTier = await context.customerTier.getCurrentTier(
        customerId,
        reward.id
      );
      if (lastTier) {
        const tierOngoingPerks = _.filter(
          await context.rewardTierPerk.getAllByRewardTierId(
            lastTier.rewardTierId
          ),
          o => o.applyType === rewardTierPerkApplyType.ONGOING
        );

        tierOngoingPerks.map(ongoingPerk => {
          if (ongoingPerk.type === rewardTierPerkType.DISCOUNT) {
            if (parseFloat(ongoingPerk.value) === 100) {
              tierDiscountMultiplier = 0;
            } else {
              tierDiscountMultiplier = (100 - ongoingPerk.value) / 100;
            }
            consumedPerks.push({
              type: ongoingPerk.type,
              quantity: parseFloat(ongoingPerk.value),
              tierDiscountMultiplier,
            });
          }
          return ongoingPerk;
        });
      }
    }
  }

  const optionToPrice = ({ price }) =>
    new Money(price, currency.decimalPlace, currency.lowestDenomination);

  // console.log('optionToPrice', optionToPrice);
  let checkoutItems = items.map(item => {
    return {
      type: item.type,
      quantity: item.quantity,
      // initialize free items by rewards
      freeByReward: 0,
      consumeQuantitybyReward: 0,

      freeByCoupon: 0,
      consumeQuantitybyCoupon: 0,
      couponDiscountAmount: new Money(
        0,
        currency.decimalPlace,
        currency.lowestDenomination
      ),
      price: item.selectedOptions
        .map(optionToPrice)
        .reduce((optionsTotal, price) => {
          return price.add(optionsTotal);
        }),
    };
  });

  checkoutItems = _.sortBy(checkoutItems, [t => t.price.intValue]);

  let rewardPerkFreeAmount = 0;
  let rewardDiscountAmount = 0;
  // sum of reward discount and free food/drink
  let rewardAmount = 0;

  let couponPerkFreeAmount = 0;
  // sum of coupon discount and free food/drink
  let couponAmount = 0;

  // prices of all the items without any discount
  let subtotal = 0;
  // prices of the items after reward free food/drink and discount
  let firstIntermediateSubtotal = 0;
  // prices of the items after reward free food/drink, reward discount & coupon free food/drink
  // let secondIntermediateSubtotal = 0;
  // prices of the items after reward free food/drink, reward discount, coupon free food/drink & coupon percentage/flat amount
  // let thirdIntermediateSubtotal = 0;

  // APPLY REWARD PERKS(FREE)
  checkoutItems.map(ckItem => {
    let perk = null;
    // let consumeQuantity = 0;
    switch (ckItem.type) {
      case menuItemType.FOOD:
        perk = _.find(
          perks,
          t => t.type === rewardTierPerkType.FREE_FOOD && !t.coupon
        );
        break;
      case menuItemType.DRINK:
        perk = _.find(
          perks,
          t => t.type === rewardTierPerkType.FREE_DRINK && !t.coupon
        );
        break;
      default:
        perk = null;
    }
    const ckItemQuantity = parseFloat(ckItem.quantity);
    if (perk) {
      ckItem.freeByReward = parseFloat(perk.quantity);
      // set perk free quantity for line item
      if (ckItemQuantity >= ckItem.freeByReward) {
        ckItem.consumeQuantitybyReward = ckItem.freeByReward;
      } else {
        ckItem.consumeQuantitybyReward = ckItemQuantity;

        // we have more free items so only ckItemQuantity number of drinks we are redeeming
        ckItem.freeByReward = ckItemQuantity;
      }
      rewardPerkFreeAmount +=
        ckItem.consumeQuantitybyReward * ckItem.price.value;
      perks = consumePerk(
        perk.type,
        perk.coupon,
        ckItem.consumeQuantitybyReward,
        perks,
        consumedPerks
      );
    }
    // apply reward discount on each quantity

    return ckItem;
  });
  // console.log('perks///', perks);
  // APPLY COUPON PERKS(FREE) AND DISCOUNT
  checkoutItems.map(ckItem => {
    let perk = null;
    switch (ckItem.type) {
      case menuItemType.FOOD:
        perk = _.find(
          perks,
          t => t.type === rewardTierPerkType.FREE_FOOD && t.coupon
        );
        break;
      case menuItemType.DRINK:
        perk = _.find(
          perks,
          t => t.type === rewardTierPerkType.FREE_DRINK && t.coupon
        );
        break;
      default:
        perk = null;
    }
    // quantities left after free items
    const ckItemQuantity = parseFloat(ckItem.quantity) - ckItem.freeByReward;
    if (perk) {
      ckItem.freeByCoupon = parseFloat(perk.quantity);
      // set perk free quantity for line item
      if (ckItemQuantity >= ckItem.freeByCoupon) {
        ckItem.consumeQuantitybyCoupon = ckItem.freeByCoupon;
      } else {
        ckItem.consumeQuantitybyCoupon = ckItemQuantity;

        // we have more free items so only ckItemQuantity number of drinks we are redeeming
        ckItem.freeByCoupon = ckItemQuantity;
      }
      if (tierDiscountMultiplier < 1) {
        couponPerkFreeAmount +=
          ckItem.consumeQuantitybyCoupon *
          (ckItem.price.value -
            (ckItem.price.value - ckItem.price.value * tierDiscountMultiplier));
      } else {
        couponPerkFreeAmount +=
          ckItem.consumeQuantitybyCoupon * ckItem.price.value;
      }

      perks = consumePerk(
        perk.type,
        perk.coupon,
        ckItem.consumeQuantitybyCoupon,
        perks,
        consumedPerks
      );
    }
    return ckItem;
  });
  // total for all the items exluding free drinks or foods of reward perks
  subtotal = _.reduce(
    checkoutItems,
    (total, item) => item.price.mult(item.quantity).add(total),
    new Money(0, currency.decimalPlace, currency.lowestDenomination)
  );
  // get reward perk free food/drink amount
  rewardPerkFreeAmount = new Money(
    rewardPerkFreeAmount,
    currency.decimalPlace,
    currency.lowestDenomination
  );
  // calcualted ongoing reward discount on each item
  if (tierDiscountMultiplier < 1) {
    _.forEach(checkoutItems, item => {
      rewardDiscountAmount +=
        (item.price.value - item.price.value * tierDiscountMultiplier) *
        (item.quantity - item.freeByReward);
    });
    rewardDiscountAmount = new Money(
      rewardDiscountAmount,
      currency.decimalPlace,
      currency.lowestDenomination
    );
  } else {
    rewardDiscountAmount = new Money(
      0,
      currency.decimalPlace,
      currency.lowestDenomination
    );
  }

  // sum of reward discount and free food/drink
  rewardAmount = rewardPerkFreeAmount.add(rewardDiscountAmount);

  // first intermediate sub total is subtracting reward perk free amount and reward discount from subtotal
  firstIntermediateSubtotal = subtotal.sub(rewardAmount);
  // get coupon perk free food/drink amount
  couponPerkFreeAmount = new Money(
    couponPerkFreeAmount,
    currency.decimalPlace,
    currency.lowestDenomination
  );
  // second immediate subtotal. after firstIntermediateSubtotal and then discount of coupon free food and drink
  // secondIntermediateSubtotal = firstIntermediateSubtotal.sub(
  //   couponPerkFreeAmount
  // );
  // find discount amount for firstIntermediateSubtotal
  const discount = await context.coupon.fetchDiscount({
    customerId,
    couponId,
    subtotal: firstIntermediateSubtotal.value,
    perksAmount: couponPerkFreeAmount.value,
    useCredits,
    currencyId: currency.id,
  });
  discount.amount = new Money(
    discount.amount,
    currency.decimalPlace,
    currency.lowestDenomination
  );
  if (discount.amount > 0) {
    consumedPerks.push({
      type: 'COUPON',
      value: discount.amount,
    });
  }
  // sum of coupon discount and free food/drink
  // couponAmount = couponPerkFreeAmount.add(discount.amount);
  couponAmount = discount.amount;
  let fee = serviceFee;
  switch (orderType) {
    case orderTypes.DELIVERY:
      fee = deliveryFee;
      break;
    case orderTypes.EXPRESS_DELIVERY:
      fee = expressDeliveryFee;
      break;
    default:
      fee = serviceFee;
      break;
  }

  fee = new Money(fee, currency.decimalPlace, currency.lowestDenomination);
  let freeDelivery = _.find(
    perks,
    t => t.type === rewardTierPerkType.FREE_DELIVERY && !t.coupon
  );
  if (!freeDelivery) {
    freeDelivery = _.find(
      perks,
      t => t.type === rewardTierPerkType.FREE_DELIVERY && t.coupon
    );
  }

  const originalFee = fee;
  if (freeDelivery && parseFloat(freeDelivery.quantity) > 0) {
    fee = new Money(0, currency.decimalPlace, currency.lowestDenomination);
    perks = consumePerk(
      freeDelivery.type,
      freeDelivery.coupon,
      1,
      perks,
      consumedPerks
    );
  }
  let subtotalWithAllDiscounts;
  let isCashbackCoupon = false;
  if (coupon && coupon.type === promoType.CASHBACK) {
    isCashbackCoupon = true;
    subtotalWithAllDiscounts = subtotal.sub(rewardAmount.round());
  } else {
    subtotalWithAllDiscounts = subtotal
      .sub(rewardAmount.round())
      .sub(couponAmount.round());
  }

  // Math.max here is in case the discount was greater than the
  // subtotal + fee.
  const total = Math.max(
    subtotalWithAllDiscounts.add(fee.round()).round().value,
    0
  );

  const {
    credits: discoveryCreditUsed,
  } = await context.discoveryCredit.eligibleDiscoveryCreditForBrand({
    brandLocationId,
    customerId,
    total: isCashbackCoupon ? total - couponAmount.value : total,
  });

  let totalAfterDiscoveryCredits = total;
  if (Number(discoveryCreditUsed) > 0) {
    totalAfterDiscoveryCredits -= discoveryCreditUsed;
  }

  let creditsUsed = 0.0;
  let giftCardCreditsUsed = 0.0;
  let amountDue = totalAfterDiscoveryCredits;
  if (useCredits) {
    const customerBalance = await context.loyaltyTransaction.getBalanceByCustomer(
      customerId,
      currency.id
    );
    // console.log('customerBalance', customerBalance);
    creditsUsed = calculateCredit(customerBalance, totalAfterDiscoveryCredits);
    amountDue = calculateAmountDue(customerBalance, totalAfterDiscoveryCredits);
  }

  if (giftCardIds && giftCardIds.length > 0) {
    const giftCardBalance = await context.giftCardTransaction.getGiftCardBalance(
      giftCardIds[0]
    );
    giftCardCreditsUsed = calculateGCCredit(giftCardBalance, amountDue);
    amountDue = calculateGCAmountDue(giftCardBalance, amountDue);
  }

  return {
    fee: fee.round().value,
    subtotal: subtotal.value,
    total,
    amountDue,
    creditsUsed,
    giftCardCreditsUsed,
    consumedPerks,
    currencyId: currency.id,
    vat,
    isCashbackCoupon,
    couponAmount: couponAmount.round().value,
    rewardAmount: rewardAmount.round().value,
    currency,
    originalFee: originalFee.round().value,
    discoveryCreditUsed,
  };
};

module.exports = calculatePrice;
