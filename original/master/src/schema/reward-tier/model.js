const { map, flatten, uniq, forEach } = require('lodash');
const { addLocalizationField } = require('../../lib/util');
const BaseModel = require('../../base-model');
const { rewardTierError } = require('../root/enums');

class RewardTier extends BaseModel {
  constructor(db, context) {
    super(db, 'reward_tiers', context);
  }

  async getAllByRewardId(rewardId) {
    const rsp = await this.context.sqlCache(
      this.getAll()
        .where('reward_id', rewardId)
        .orderBy('sort_order', 'asc')
    );
    return addLocalizationField(rsp, 'title');
  }

  async getAllByRewardIds(rewardIds) {
    const rspList = await this.context.sqlCache(
      this.getAll()
        .whereIn('reward_id', rewardIds)
        .orderBy('sort_order', 'asc')
    );
    return addLocalizationField(rspList, 'title');
  }

  async validateRewardTierInput(rewardTierInput) {
    const errors = [];
    const reward = await this.context.reward.getById(rewardTierInput.rewardId);

    if (!reward) {
      errors.push(rewardTierError.INVALID_REWARD);
    }

    return errors;
  }

  deleteById(id) {
    return this.db(this.tableName)
      .where('id', id)
      .del();
  }

  async save(rewardTiersInput) {
    const errors = [];
    let errorDescription = '';
    const rewardTierUsed = [];
    const deletedTiers = [];
    const deletedTierPerks = [];
    const rewardTierNames = [];
    map(rewardTiersInput, rt => {
      if (rt.deleted === true) {
        if (rt.id) {
          // check if already exists
          rewardTierUsed.push(
            this.context.customerTier.isRewardTierUsed(rt.id)
          );
          // delete teir perks
          deletedTierPerks.push(
            this.context.rewardTierPerk.deleteByRewardTierId(rt.id)
          );
          // delete tiers
          deletedTiers.push(this.deleteById(rt.id));
        }
      }
      // delete rt.deleted;
      return rt;
    });
    const res = await Promise.all(rewardTierUsed);
    if (res.length > 0) {
      let canDelete = true;
      forEach(res, r => {
        if (r !== undefined) {
          canDelete = false;
          rewardTierNames.push(this.getById(r.rewardTierId));
          errors.push(rewardTierError.TIER_IN_USE);
        }
      });
      if (!canDelete) {
        const res2 = await Promise.all(rewardTierNames);
        if (res2.length > 0) {
          forEach(res2, r => {
            if (r !== undefined) {
              errorDescription += `${r.title}, `;
            }
          });
          if (errorDescription) {
            errorDescription = errorDescription.trim().slice(0, -1);
            errorDescription += res2.length > 1 ? ' are' : ' is';
            errorDescription += ' used by users.';
          }
        }
        return { errors, errorDescription };
      }
    }

    await Promise.all(deletedTierPerks);
    await Promise.all(deletedTiers);
    await super.save(rewardTiersInput);
    return { errors, errorDescription };
  }

  async validateRewardTiersInput(rewardTiersInput) {
    return uniq(
      flatten(
        await Promise.all(
          map(rewardTiersInput, this.validateRewardTierInput.bind(this))
        )
      )
    );
  }
}

module.exports = RewardTier;
