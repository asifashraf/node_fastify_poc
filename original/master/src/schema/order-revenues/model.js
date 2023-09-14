const BaseModel = require('../../base-model');
const { assign } = require('lodash');
const {
  revenueOrderTypes,
  revenueModel: revenueModels,
  orderTypes: fulfillmentOrderTypes,
} = require('./../root/enums');
const moment = require('moment');
const CurrencyValue = require('../../lib/currency');

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
          const { signDate, expiryDate, revenueModel } = subscriptionModel;
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

            const data = {
              brandSubscriptionModelId: subscriptionModel.id,
              orderType: revenueOrderTypes.ORDER_SET,
              referenceOrderId,
              newCustomer,
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

            // eslint-disable-next-line max-depth
            switch (revenueModel) {
              case revenueModels.ZERO_COMMISSION_MODEL:
                await this.calculateOrderSetZeroCommission({
                  referenceOrderId,
                  subscriptionModel,
                  brandId,
                  customerId,
                  currency,
                  orderRevenue,
                  orderFullfilmentType,
                  newCustomer,
                });
                break;
              case revenueModels.PERCENTAGE_COMMISSION_MODEL:
                await this.calculateOrderSetPercentageCommission({
                  referenceOrderId,
                  subscriptionModel,
                  brandId,
                  customerId,
                  currency,
                  orderRevenue,
                  orderFullfilmentType,
                  gmv,
                });
                break;
              default:
                console.log(`revenue ${revenueModel} not found for ${brandId}`);
                break;
            }
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
    let { pickupCommission, deliveryCommission } = subscriptionModel;
    gmv = this.convertToCurrencyObject(gmv, currency);
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
