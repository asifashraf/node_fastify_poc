const { sortBy, find, first } = require('lodash');

const BaseModel = require('../../base-model');
const { kinesisEventTypes } = require('../../lib/aws-kinesis-logging');
const { customerTiersMove } = require('../root/enums');

class CustomerTier extends BaseModel {
  constructor(db, context) {
    super(db, 'customer_tiers', context);
  }

  getByRewardTierId(rewardTierId) {
    return this.getAll()
      .where('reward_tier_id', rewardTierId)
      .orderBy('created', 'desc');
  }

  async isRewardTierUsed(rewardTierId) {
    return first(
      await this.getAll()
        .select('customer_tiers.*', 'reward_tiers.title')
        .join(
          'reward_tiers',
          'customer_tiers.reward_tier_id',
          'reward_tiers.id'
        )
        .where('reward_tier_id', rewardTierId)
        .limit(1)
    );
  }

  getByCustomerId(customerId) {
    return (
      this.getAll()
        .where('customer_id', customerId)
        // .andWhere('move', 'UP')
        .orderBy('created', 'desc')
    );
  }

  getByRewardId(rewardId) {
    return this.getAll()
      .where('reward_id', rewardId)
      .orderBy('created', 'desc');
  }

  async getCurrentTier(customerId, rewardId) {
    return first(
      await this.getByCustomerId(customerId).where('reward_id', rewardId)
    );
  }

  async getCurrentTiers(customerId, rewardIds) {
    return this.getAll()
      .andWhere('customer_id', customerId)
      .whereIn('reward_id', rewardIds)
      .orderBy('created', 'desc');
  }

  // Maintainer, please add recalculation of customer tiers on tier levels change (ex 4000 -> 2000)
  async syncTier(customerId, rewardId) {
    if (!customerId || !rewardId) {
      return false;
    }
    const tiers = sortBy(
      await this.context.rewardTier.getAllByRewardId(rewardId),
      [t => parseFloat(t.requiredPoints)]
    ).reverse();
    // console.log('tiers', tiers);
    // const customerTiers = await this.getByCustomerId(customerId).where(
    //   'reward_id',
    //   rewardId
    // );

    const points = await this.context.rewardPointsTransaction.calculatePoints(
      customerId,
      rewardId
    );
    // console.log('<<<points>>>', points);
    const customerTier = {
      customerId,
      rewardId,
      move: customerTiersMove.UP,
    };
    const eligibleTier = find(
      tiers,
      t => parseFloat(points) >= parseFloat(t.requiredPoints)
    );
    if (!eligibleTier) {
      return false;
    }
    const customerLastTier = await this.getCurrentTier(customerId, rewardId);
    if (customerLastTier) {
      customerLastTier.requiredPoints = find(
        tiers,
        t => t.id === customerLastTier.rewardTierId
      ).requiredPoints;
      if (customerLastTier.rewardTierId === eligibleTier.id) {
        return customerLastTier;
      }
      if (
        parseFloat(customerLastTier.requiredPoints) >
        parseFloat(eligibleTier.requiredPoints)
      ) {
        // Commented out down movement, as it will be hopefully rewritten
        this.context.kinesisLogger.sendLogEvent(
          {
            customerId,
            rewardId,
            customerLastTier,
            customerTier,
            eligibleTier,
            points,
            tiers,
          },
          kinesisEventTypes.customerTierDown
        );
        customerTier.move = customerTiersMove.DOWN;
        // return false;
      }
    }
    customerTier.rewardTierId = eligibleTier.id;
    const id = await this.save(customerTier);
    if (customerTier.move === customerTiersMove.DOWN) {
      const perks = await this.context.rewardTierPerk.getAllByRewardTierId(
        customerLastTier.rewardTierId
      );
      await this.context.customerPerk.removePerks(customerId, rewardId, perks);
    }
    const perks = await this.context.rewardTierPerk.getAllByRewardTierId(
      eligibleTier.id
    );
    await this.context.customerPerk.addPerks(customerId, rewardId, perks);
    return this.getById(id);
  }
}

module.exports = CustomerTier;
