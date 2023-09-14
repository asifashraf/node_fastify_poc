const { first, find } = require('lodash');

const BaseModel = require('../../base-model');
const {
  rewardPointsTransactionSource,
  rewardTierPerkType,
  couponType,
  couponDetailUsedOn,
} = require('../root/enums');

class RewardPointsTransaction extends BaseModel {
  constructor(db, context) {
    super(db, 'reward_points_transactions', context);
  }

  getByRewardId(rewardId) {
    return this.getAll()
      .where('reward_id', rewardId)
      .orderBy('created', 'desc');
  }

  getByCustomerId(customerID) {
    return this.getAll()
      .where('customer_id', customerID)
      .orderBy('created', 'desc');
  }

  calculateOrderPoints({orderSetTotal, orderSetFee, rewardConversionRate}) {
    // we eliminate floating point issue by transforming both numbers to integers
    const precision = Math.pow(10, 5);
    // const subtotal = Math.round(orderSet.subtotal * precision);
    const total = Math.round(orderSetTotal * precision);
    const fee = Math.round(orderSetFee * precision);
    const conversionRate = Math.round(rewardConversionRate * precision);
    return Math.round((total - fee) / conversionRate);
  }

  async addPointsForOrderSet(orderSet) {
    if (!orderSet) {
      console.log('invalid order set:', orderSet);
      return false;
    }

    const reward = await this.context.reward.getRewardByBrandLocationId(
      orderSet.brandLocationId
    );

    if (!reward) {
      // console.log(`order set not in a reward program:`, orderSet);
      return false;
    }
    const points = this.calculateOrderPoints({
      orderSetTotal: orderSet.total,
      orderSetFee: orderSet.fee,
      rewardConversionRate: reward.conversionRate,
    });
    const pointsAdded = first(
      await this.db(this.tableName)
        .count('*')
        .where('reward_id', reward.id)
        .where('source', rewardPointsTransactionSource.ORDER_SET)
        .where('source_id', orderSet.id)
        .where('customer_id', orderSet.customerId)
        .where('points', points)
    );

    if (parseInt(pointsAdded.count, 10) >= 1) {
      console.log('points already added for this order set:', orderSet);
      return false;
    }

    const transaction = {
      rewardId: reward.id,
      sourceId: orderSet.id,
      customerID: orderSet.customerId,
      conversionRate: reward.conversionRate,
      points,
      source: rewardPointsTransactionSource.ORDER_SET,
    };
    await this.save(transaction);
    // give special points
    const {
      availablePerks,
    } = await this.context.customer.getRewardProgramDetailsNew(
      orderSet.customerId,
      reward.id
    );
    const specialPointsTransactions = [];
    const usedSpecialPerks = [];
    if (availablePerks) {
      availablePerks.map(availablePerk => {
        if (availablePerk.type === rewardTierPerkType.ADD_POINTS) {
          specialPointsTransactions.push({
            rewardId: reward.id,
            sourceId: availablePerk.id,
            customerID: orderSet.customerId,
            conversionRate: 1,
            points: availablePerk.total,
            source: rewardPointsTransactionSource.PERK,
          });
          usedSpecialPerks.push({
            type: availablePerk.type,
            quantity: parseFloat(availablePerk.total),
          });
        }
        return availablePerk;
      });
    }
    // if orderSet have a coupon, get CouponDetail of type ADD_POINTS
    const usedCouponDetails = [];
    if (orderSet.couponId) {
      const coupon = await this.context.coupon.getById(orderSet.couponId);
      const minApplicableLimit = parseFloat(coupon.minApplicableLimit);
      const subtotal = parseFloat(orderSet.subtotal);
      if (
        minApplicableLimit === 0 ||
        (minApplicableLimit > 0 && subtotal >= minApplicableLimit)
      ) {
        const addPointsCouponDetail = find(
          await this.context.couponDetail.getAllByCoupon(orderSet.couponId),
          cd => cd.type === couponType.ADD_POINTS
        );
        if (addPointsCouponDetail) {
          specialPointsTransactions.push({
            rewardId: reward.id,
            sourceId: orderSet.couponId,
            customerID: orderSet.customerId,
            conversionRate: 1,
            points: addPointsCouponDetail.amount,
            source: rewardPointsTransactionSource.COUPON,
          });
          usedCouponDetails.push({
            usedOn: couponDetailUsedOn.ORDER_SET,
            referenceId: orderSet.id,
            couponId: orderSet.couponId,
            type: couponType.ADD_POINTS,
            amount: addPointsCouponDetail.amount,
          });
        }
      }
    }
    if (specialPointsTransactions.length > 0) {
      await this.save(specialPointsTransactions);
    }
    if (usedSpecialPerks.length > 0) {
      await this.context.customerUsedPerk.addPerks(
        orderSet.id,
        usedSpecialPerks
      );
    }
    if (usedCouponDetails.length > 0) {
      await this.context.usedCouponDetail.save(usedCouponDetails);
    }
    await this.context.customerTier.syncTier(orderSet.customerId, reward.id);
    return true;
  }

  async calculatePoints(customerId, rewardId) {
    const sumPoints = await this.getAll()
      .where('customer_id', customerId)
      .andWhere('reward_id', rewardId)
      .groupBy('reward_id')
      .sum({ total: 'points' })
      .first();
    return sumPoints ? parseFloat(sumPoints.total) : 0;
  }

  async calculateRewardsPoints(customerId, rewardIds) {
    const allSumPoints = await this.getAll()
      .whereIn('reward_id', rewardIds)
      .andWhere('customer_id', customerId)
      .groupBy('reward_id')
      .sum({ total: 'points' });
    return allSumPoints.map(sumPoint => {
      sumPoint.total = parseFloat(sumPoint.total);
      return sumPoint;
    });
  }

  async getOrderPoints(orderSetId) {
    const rewardPointsTransaction = await this.roDb(this.tableName)
      .where({sourceId: orderSetId})
      .first();
    return rewardPointsTransaction?.points || 0;
  }
}

module.exports = RewardPointsTransaction;
