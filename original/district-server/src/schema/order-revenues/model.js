const BaseModel = require('../../base-model');
const { assign } = require('lodash');
const {
  revenueOrderTypes,
  revenueModel: revenueModels,
  orderTypes: fulfillmentOrderTypes,
  couponDetailUsedOn,
  couponType,
} = require('./../root/enums');
const moment = require('moment');
const CurrencyValue = require('../../lib/currency');
const SlackWebHookManager = require('../slack-webhook-manager/slack-webhook-manager');

class OrderRevenue extends BaseModel {
  constructor(db, context) {
    super(db, 'order_revenues', context);
  }

  getByOrderId(orderType, referenceOrderId) {
    return this.db(this.tableName)
      .where('order_type', orderType)
      .where('reference_order_id', referenceOrderId)
      .first();
  }

  async calculateRevenue(orderType, orderSetId) {
    if (revenueOrderTypes.ORDER_SET === orderType) {
      await this.calculateOrderSetRevenue(orderSetId);
    }
  }

  async calculateOrderSetRevenue(orderSetId) {
    try {
      const {
        id: referenceOrderId,
        customerId,
        brandLocationId,
        paid,
        subtotal: gmv,
        total,
        rewardAmount,
        fee,
        couponAmount,
        couponId,
        prePaid,
        paymentMethod,
        paymentProvider,
        isCashbackCoupon,
      } = await this.context.orderSet.getById(orderSetId);
      if (paid) {
        const { brandId } = await this.context.brandLocation.getById(
          brandLocationId
        );
        const { countryId } = await this.context.brand.getById(brandId);
        const { currencyId } = await this.context.country.getById(countryId);
        const currency = await this.context.currency.getById(currencyId);
        const subscriptionModel = await this.context.brandSubscriptionModel.getActiveBrandSubscriptionModel(
          brandId
        );
        if (subscriptionModel) {
          const { signDate, expiryDate, revenueModel, hasTrial, trialStartDate, trialEndDate } = subscriptionModel;
          let isBetween = true;
          if (expiryDate) {
            isBetween = moment(moment().format('YYYY-MM-DD')).isBetween(
              moment(signDate).format('YYYY-MM-DD'),
              moment(expiryDate).format('YYYY-MM-DD')
            );
          } else {
            isBetween = moment(moment().format('YYYY-MM-DD')).isAfter(
              moment(signDate).format('YYYY-MM-DD')
            );
          }

          if (isBetween) {
            const {
              type: orderFullfilmentType,
            } = await this.context.orderFulfillment.getByOrderSet(
              referenceOrderId
            );

            const newCustomer = await this.isNewCustomerForOrderSet(
              customerId,
              brandId
            );

            const customerUsedPerks = await this.context.customerUsedPerk.getByOrderSetId(
              referenceOrderId
            );

            const usedCouponsList = await this.context.usedCouponDetail.getAllUsedOn(
              couponDetailUsedOn.ORDER_SET,
              referenceOrderId
            );

            let coupon = null;
            if (couponId) coupon = await this.context.coupon.getById(couponId);

            const serviceFee = this.convertToCurrencyObject(fee, currency);
            let deliveryFee = this.convertToCurrencyObject(0, currency);
            let deliveryFeePaidByCofe = this.convertToCurrencyObject(0, currency);
            let deliveryFeePaidByVendor = this.convertToCurrencyObject(0, currency);
            if (orderFullfilmentType === fulfillmentOrderTypes.DELIVERY || orderFullfilmentType === fulfillmentOrderTypes.EXPRESS_DELIVERY) {
              const brand = await this.context.brand.getByBrandLocation(brandLocationId);
              deliveryFee = this.convertToCurrencyObject(
                orderFullfilmentType === fulfillmentOrderTypes.DELIVERY ? brand.deliveryFee : brand.expressDeliveryFee,
                currency
              );

              if (deliveryFee !== serviceFee) {
                const freeDeliveryCoupon = usedCouponsList.find(t => t.type === couponType.FREE_DELIVERY);
                const freeDeliveryPerks = customerUsedPerks.find(t => t.type === 'FREE_DELIVERY');
                if (freeDeliveryCoupon) {
                  deliveryFeePaidByCofe = deliveryFee.sub(serviceFee)
                    .mult(coupon.percentPaidByCofe)
                    .div(100);

                  deliveryFeePaidByVendor = deliveryFee.sub(serviceFee).sub(deliveryFeePaidByCofe);
                } else if (freeDeliveryPerks) {
                  deliveryFeePaidByCofe = deliveryFee.sub(serviceFee);
                }
              }
            }

            /**
             * For Revenue calculation
             * Revenu = (subtotal + delivery fee) * commission rate
             * WARNING fee ( service fee) is wrongly calculated.
             *
             * Revenue is calculated using subtotal without including perks and coupons,
             * That's why, delivery fee must be calculated without including perks and coupons.
             * After revenue calculation, perks and coupons should be calculate for netRevenue.
             */
            const totalAmount = this.convertToCurrencyObject(gmv, currency).add(deliveryFee);

            let totalCouponAmount = this.convertToCurrencyObject(0, currency);
            let couponPaidByCofe = this.convertToCurrencyObject(0, currency);
            let couponPaidByVendor = this.convertToCurrencyObject(0, currency);
            if (couponAmount > 0 && !isCashbackCoupon) {
              totalCouponAmount = this.convertToCurrencyObject(couponAmount, currency);
              const freeCouponPerkTypes = [
                couponType.FREE_DRINK,
                couponType.FREE_FOOD,
                couponType.PERCENTAGE,
                couponType.FLAT_AMOUNT,
              ];
              const couponPerks = usedCouponsList.filter(couponDetail => freeCouponPerkTypes.includes(couponDetail.type));
              if (couponPerks.length > 0) {
                couponPaidByCofe = totalCouponAmount
                  .mult(coupon.percentPaidByCofe)
                  .div(100);
                couponPaidByVendor = totalCouponAmount.sub(couponPaidByCofe);
              }
            }

            /**
             * REVENUE CALCULATION =>
             *  Revenue = ((Total Items Amount + Delivery Fee)* Commission) or (Zero commission and Fixed rate) !!!(without perks, coupons etc...)!!!
             *  When coupon type is CashBack dont include to calculation because of cashback coupon added credits to wallet for next order
             *  Also this credits has expired time like 7 days...
             * NET REVENUE CALCULATION
             * Cash =>
             *  Net Revenue = Revenue - (given perks by COFE)
             *  Net Revenue > 0 ? Vendor paid to Cofe : Cofe paid to Vendor
             *  Example Calculation
             *  1- 30 items total + 5 delivery => 35 total and delivery is free with coupons
             *     case a =>  Coupons (%0 COFE + %100 Vendor)
             *        Revenue = 35 * %10(Rate) => 3.5
             *        Net Revenue = 3.5 - (5 * %0) (Paid from COFE) => 3.5
             *     case b =>  Coupons (%50 COFE + %50 Vendor)
             *        Revenue = 35 * %10(Rate) => 3.5
             *        Net Revenue = 3.5 - (5 * %50) (Paid from COFE) => 1
             *     case c =>  Coupons (%70 COFE + %30 Vendor)
             *        Revenue = 35 * %10(Rate) => 3.5
             *        Net Revenue = 3.5 - (5 * %70) (Paid from COFE) => 0
             *     case d =>  Coupons (%100 COFE + %0 Vendor)
             *        Revenue = 35 * %10(Rate) => 3.5
             *        Net Revenue = 3.5 - (5 * %100) (Paid from COFE) => -1.5
             * Cash =>
             *  Net Revenue = Revenue - (given perks by COFE)
             *  Net Revenue > 0 ? Vendor paid to Cofe : Cofe paid to Vendor
             * Card =>
             *  Net Revenue = Revenue - (given perks by COFE)
             *  Cofe paid to Vendor = Paid Amount - CC commission - Net Revenue
             * Coupons =>
             *  Net Revenue = Revenue - (given perks by COFE)
             *  Net Revenue > 0 ? Vendor paid to Cofe : Cofe paid to Vendor
             */

            let revenue = this.convertToCurrencyObject(0, currency);
            if (revenueModel === revenueModels.PERCENTAGE_COMMISSION_MODEL) {
              const { pickupCommission, deliveryCommission } = subscriptionModel;
              let commission = this.convertToCurrencyObject(pickupCommission, currency);
              if (orderFullfilmentType === fulfillmentOrderTypes.DELIVERY || orderFullfilmentType === fulfillmentOrderTypes.EXPRESS_DELIVERY) {
                commission = this.convertToCurrencyObject(
                  deliveryCommission,
                  currency
                );
              }
              revenue = totalAmount.mult(commission).div(100);
            } else if (revenueModel === revenueModels.ZERO_COMMISSION_MODEL && newCustomer) {
              const { flatRate } = subscriptionModel;
              revenue = this.convertToCurrencyObject(flatRate, currency);
            }

            if (hasTrial && trialStartDate && trialEndDate) {
              if (moment(moment().format('YYYY-MM-DD')).isBetween(
                moment(trialStartDate).format('YYYY-MM-DD'),
                moment(trialEndDate).format('YYYY-MM-DD')
              )) {
                revenue = this.convertToCurrencyObject(0, currency);
              }
            }

            let discoveryCredit = this.convertToCurrencyObject(0, currency);
            let credit = this.convertToCurrencyObject(0, currency);
            let giftCardAmount = this.convertToCurrencyObject(0, currency);
            let giftCardAmountPaidByCofe = this.convertToCurrencyObject(0, currency);
            let giftCardAmountPaidByVendor = this.convertToCurrencyObject(0, currency);
            let netRevenue = this.convertToCurrencyObject(0, currency);
            let creditCommission = this.convertToCurrencyObject(0, currency);
            if (prePaid) {
              if (
                prePaid.discoveryCreditUsed &&
                Number(prePaid.discoveryCreditUsed) > 0
              ) {
                discoveryCredit = this.convertToCurrencyObject(Number(prePaid.discoveryCreditUsed), currency);
              }
              if (prePaid.creditsUsed && Number(prePaid.creditsUsed) > 0) {
                credit = this.convertToCurrencyObject(Number(prePaid.creditsUsed), currency);
              }
              if (prePaid.giftCards && prePaid.giftCards.length > 0) {
                giftCardAmount = this.convertToCurrencyObject(Number(prePaid.giftCards[0].value), currency);
                const giftCard = await this.context.giftCard.getById(prePaid.giftCarda[0].id);
                // nullable field check first
                if (giftCard.giftCardTemplateId) {
                  const giftCardTemplate = await this.context.giftCardTemplate.getById(giftCard.giftCardTemplateId);
                  if (giftCardTemplate) {
                    giftCardAmountPaidByCofe = giftCardAmount
                      .mult(giftCardTemplate.percentPaidByCofe)
                      .div(100);
                    giftCardAmountPaidByVendor = giftCardAmount.sub(giftCardAmountPaidByCofe);
                  }
                }
              }
            }

            netRevenue = revenue.sub(deliveryFeePaidByCofe).sub(couponPaidByCofe).sub(discoveryCredit).sub(giftCardAmountPaidByCofe).sub(credit);
            console.log('Net Revenue', netRevenue.toCurrencyValue());
            const cardMethods = ['AMEX', 'APPLE_PAY', 'CARD', 'GOOGLE_PAY', 'KNET', 'MADA', 'SAVED_CARD', 'STC_PAY'];
            if (cardMethods.includes(paymentMethod)) {
              /**
               * PAYMENT METHODS
               *  1 2 3... (Numbers wtf?)
               *  AMEX => AMEX
               *  APPLE_PAY => APPEY_PAY
               *  CARD => VISA_MASTERCARD
               *  CASH ignore
               *  CREDITS ignore
               *  GIFT_CARDS_*** ??
               *  GOOGLE_PAY => GOOGLE_PAY
               *  KNET => KNET
               *  MADA => MADA
               *  SAVED_CARD =>  VISA_MASTERCARD or AMEX ??
               *  STC_PAY => STC_PAY
               *  Null
               *
               * calculation order that paid with Credit Cards
               * credit card commission = (total - credits - gift card -discovery credit) * credit card rate
               */

              let paymentGatewayMethod = paymentMethod;
              if (paymentMethod === 'CARD' || paymentMethod === 'SAVED_CARD') {
                paymentGatewayMethod = 'VISA_MASTERCARD';
              }
              const pGC = await this.context.paymentGatewayCharge.findByPaymentGatewayAndMethodWithCountryId(paymentGatewayMethod, paymentProvider, countryId);
              if (pGC) {
                if (pGC.chargeType === 'FLAT') {
                  creditCommission = this.convertToCurrencyObject(pGC.charge, currency);
                } else {
                  const paidWithCreditCard = this.convertToCurrencyObject(total, currency)
                    .sub(discoveryCredit)
                    .sub(giftCardAmount)
                    .sub(credit);
                  creditCommission = paidWithCreditCard.mult(100).div(pGC.charge);
                }
              } else {
                SlackWebHookManager.sendTextToSlack(`[ERROR] Not found payment gateway charge for order(${referenceOrderId}). Payment Method(${paymentGatewayMethod}), Payment Provider(${paymentProvider}), Country(${countryId})`);
              }
            }

            const data = {
              brandSubscriptionModelId: subscriptionModel.id,
              orderType: revenueOrderTypes.ORDER_SET,
              referenceOrderId,
              newCustomer,
              orderSubtotal: gmv,
              orderTotal: total,
              rewardAmountByCofe: rewardAmount,
              brandDeliveryFee: deliveryFee.toCurrencyValue(),
              deliveryFeePaidByCustomer: serviceFee.toCurrencyValue(),
              deliveryFeePaidByCofe: deliveryFeePaidByCofe.toCurrencyValue(),
              deliveryFeePaidByVendor: deliveryFeePaidByVendor.toCurrencyValue(),
              couponAmount: totalCouponAmount.toCurrencyValue(),
              couponPaidByCofe: couponPaidByCofe.toCurrencyValue(),
              couponPaidByVendor: couponPaidByVendor.toCurrencyValue(),
              giftCardAmount: giftCardAmount.toCurrencyValue(),
              giftCardPaidByCofe: giftCardAmountPaidByCofe.toCurrencyValue(),
              giftCardPaidByVendor: giftCardAmountPaidByVendor.toCurrencyValue(),
              discoveryCredits: discoveryCredit.toCurrencyValue(),
              credits: credit.toCurrencyValue(),
              amountPaidPaymentProvider: creditCommission.toCurrencyValue(),
              cofeRevenue: netRevenue.toCurrencyValue(),
            };

            let orderRevenue = await this.getByOrderId(
              revenueOrderTypes.ORDER_SET,
              referenceOrderId
            );
            // eslint-disable-next-line max-depth
            if (orderRevenue) {
              await this.save(assign(data, { id: orderRevenue.id }));
            } else {
              await this.save(data);
            }
            orderRevenue = await this.getByOrderId(
              revenueOrderTypes.ORDER_SET,
              referenceOrderId
            );
          }
        } else {
          console.log(
            `No Active subscription model found for brandId: ${brandId}`
          );
        }
      }
    } catch (err) {
      console.log('err', err);
    }
  }

  async calculateOrderSetZeroCommission({
    subscriptionModel,
    newCustomer,
    currency,
    orderRevenue,
  }) {
    const { flatRate } = subscriptionModel;

    const data = {
      cofeRevenue: newCustomer
        ? this.convertToCurrencyValue(flatRate, currency)
        : 0,
    };

    await this.save(assign(data, { id: orderRevenue.id }));
  }

  async calculateOrderSetPercentageCommission({
    subscriptionModel,
    currency,
    orderRevenue,
    orderFullfilmentType,
    gmv,
  }) {
    const { pickupCommission, deliveryCommission } = subscriptionModel;
    gmv = this.convertToCurrencyObject(gmv, currency);
    let commission = this.convertToCurrencyObject(pickupCommission, currency);
    if (orderFullfilmentType === fulfillmentOrderTypes.DELIVERY || orderFullfilmentType === fulfillmentOrderTypes.EXPRESS_DELIVERY) {
      commission = this.convertToCurrencyObject(
        deliveryCommission,
        currency
      );
    }
    const data = {
      cofeRevenue: commission
        .mult(gmv)
        .div(100)
        .toCurrencyValue(),
    };

    /*
    pickupCommission = this.convertToCurrencyObject(pickupCommission, currency);
    deliveryCommission = this.convertToCurrencyObject(
      deliveryCommission,
      currency
    );
    const data = {
      cofeRevenue: this.convertToCurrencyValue(0, currency),
    };
    // cofe revenue = gmv-subtotal * pickupCommission(%)
    // cofe revenue = gmv-subtotal * deliveryCommission(%)
    if (orderFullfilmentType === fulfillmentOrderTypes.PICKUP) {
      data.cofeRevenue = pickupCommission
        .div(100)
        .mult(gmv)
        .toCurrencyValue();
    } else {
      data.cofeRevenue = deliveryCommission
        .div(100)
        .mult(gmv)
        .toCurrencyValue();
    }
    */

    await this.save(assign(data, { id: orderRevenue.id }));
  }

  async isNewCustomerForOrderSet(customerId, brandId) {
    const noOfOrders = await this.context.orderSet.getCountByCustomerForBrand(
      customerId,
      brandId
    );
    return Number(noOfOrders) === 1;
  }

  convertToCurrencyValue(amount, currency) {
    return new CurrencyValue(
      amount ? Number(amount) : 0,
      currency.decimalPlace,
      currency.lowestDenomination
    ).toCurrencyValue();
  }

  convertToCurrencyObject(amount, currency) {
    return new CurrencyValue(
      amount ? Number(amount) : 0,
      currency.decimalPlace,
      currency.lowestDenomination
    );
  }
}

module.exports = OrderRevenue;
