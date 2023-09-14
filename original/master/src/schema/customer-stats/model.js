const BaseModel = require('../../base-model');
const { first } = require('lodash');
const { createLoaders } = require('./loaders');

class CustomerStats extends BaseModel {
  constructor(db, context) {
    super(db, 'customer_stats', context);
    this.loaders = createLoaders(this);
  }

  async getByCustomer(customerId) {
    const stats = first(await this.loaders.getByCustomer.load(customerId));

    // TODO: this is messed up, there's no such thing as totalKdSpent as we have multiple currencies for each customer
    // we should refactor and create new table for total orders and total spent!!

    // temp code
    const noOfOrders = await this.context.orderSet.getCountByCustomer(
      customerId
    );
    if (stats) {
      stats.totalOrders = noOfOrders;
    }
    // we shouoldn't use totalOrders and totalKdSpent as i see its totally useless
    // temp code end

    // ensure a customer stats object _always_ exists.
    return stats || { customerId, totalKdSpent: 0, totalOrders: 0 };
  }

  async increment(customerId, { totalKdSpent, totalOrders }) {
    const customerStats = await this.getByCustomer(customerId);
    return this.save({
      ...customerStats,
      totalKdSpent: Number(customerStats.totalKdSpent) + Number(totalKdSpent),
      totalOrders: customerStats.totalOrders + Number(totalOrders),
    });
  }

  async createForCustomer(customerId) {
    return await this.save({
      customerId,
      totalKdSpent: 0,
      totalOrders: 0,
    });
  }

  async getByCustomerForBrand(customerId, brandId) {
    const noOfOrders = await this.context.orderSet.getCountByCustomerForBrand(
      customerId,
      brandId
    );
    return { customerId, brandId, totalKdSpent: 0, totalOrders: noOfOrders };
  }

  async getByCustomerForBrandUsingParticularCoupon(
    customerId,
    brandId,
    couponId
  ) {
    const noOfOrders = await this.context.orderSet.getCountByCustomerForBrandUsingParticularCoupon(
      customerId,
      brandId,
      couponId
    );
    return { customerId, brandId, totalKdSpent: 0, totalOrders: noOfOrders };
  }
}

module.exports = CustomerStats;
