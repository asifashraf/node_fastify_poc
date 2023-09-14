const { map, flatten, uniq, values, difference } = require('lodash');

const BaseModel = require('../../base-model');
const { rewardTierPerkError, rewardTierPerkType } = require('../root/enums');
const { createLoaders } = require('./loaders');

class RewardTierPerk extends BaseModel {
  constructor(db, context) {
    super(db, 'reward_tier_perks', context);
    this.loaders = createLoaders(this);
  }

  getAllByRewardTierId(rewardTierId) {
    return this.loaders.byTierId.load(rewardTierId);
    // return this.context.sqlCache(
    //   this.getAll()
    //     .where('reward_tier_id', rewardTierId)
    //     .orderBy('sort_order', 'asc')
    // );
  }

  getAllByRewardId(rewardId) {
    return this.context.sqlCache(
      this.getAll()
        .select(`${this.tableName}.*`)
        .innerJoin(
          this.context.rewardTier.tableName,
          `${this.tableName}.reward_tier_id`,
          `${this.context.rewardTier.tableName}.id`
        )
        .where(`${this.context.rewardTier.tableName}.reward_id`, rewardId)
        .orderBy(`${this.context.rewardTier.tableName}.sort_order`, 'asc')
        .orderBy(`${this.tableName}.sort_order`, 'asc')
    );
  }

  async rewardTierAllowedPerks(tierId) {
    const rewardTierPerkTypes = values(rewardTierPerkType);
    let usedTiers = await this.getAll()
      .select(`${this.tableName}.type`)
      .where(`${this.tableName}.reward_tier_id`, tierId);

    usedTiers = map(usedTiers, n => n.type.trim());
    return difference(rewardTierPerkTypes, usedTiers);
  }

  async validateRewardTierPerkInput(rewardTierPerkInput) {
    const errors = [];
    const rewardTier = await this.context.rewardTier.getById(
      rewardTierPerkInput.rewardTierId
    );

    if (!rewardTier) {
      errors.push(rewardTierPerkError.INVALID_REWARD_TIER);
    }
    return errors;
  }

  deleteByRewardTierId(rewardTierId) {
    return this.db(this.tableName)
      .where('reward_tier_id', rewardTierId)
      .del();
  }

  async validateRewardTierPerksInput(rewardTierPerksInput) {
    return uniq(
      flatten(
        await Promise.all(
          map(rewardTierPerksInput, this.validateRewardTierPerkInput.bind(this))
        )
      )
    );
  }

  async getTierPerksWithMenuItems(ids) {
    const query = this.db('reward_tier_perks as rtp')
      .select(this.roDb.raw(`rtp.id as id,rtp.reward_tier_id,rtp.title,rtp.value,rtp.type,rtp.apply_type,
    rtp.created,rtp.updated,rtp.sort_order,rtp.title_ar,rtp.title_tr,rtp.discount_limit,rtpmi.id as reward_tier_perk_menu_id,rtpmi.menu_item_id`))
      .leftJoin({ rtpmi: 'reward_tier_perks_menu_items' }, 'rtpmi.reward_tier_perk_id', 'rtp.id')
      .whereIn('rtp.id', ids);
    return query;
  }
}

module.exports = RewardTierPerk;
