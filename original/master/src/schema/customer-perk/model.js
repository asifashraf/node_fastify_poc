const { first, filter, toInteger } = require('lodash');
const { addLocalizationField } = require('../../lib/util');
const moment = require('moment');
const BaseModel = require('../../base-model');
const {
  rewardTierPerkApplyType,
  rewardTierPerkType,
} = require('../root/enums');

class CustomerPerk extends BaseModel {
  constructor(db, context) {
    super(db, 'customer_perks', context);
    this.viewName = 'view_rewards';
  }

  getByCustomerId(customerID) {
    return this.getAll()
      .where('customer_id', customerID)
      .orderBy('created', 'desc');
  }

  getAvailableForReward(customerId, rewardId) {
    return this.getAll()
      .where('customer_id', customerId)
      .where('reward_id', rewardId);
  }

  async increment(customerId, rewardId, type, value = 0) {
    if (!customerId || !rewardId || !type) {
      return false;
    }
    const customerPerk = first(
      await this.getByCustomerId(customerId)
        .where('reward_id', rewardId)
        .where('type', type)
        .orderBy('total', 'asc')
        .orderBy('updated', 'desc')
    ) || { total: 0, customerId, rewardId, type };
    return this.save({
      ...customerPerk,
      total: parseFloat(parseFloat(customerPerk.total) + parseFloat(value)),
    });
  }

  async addPerks(customerId, rewardId, perks) {
    if (!customerId || !rewardId) {
      return false;
    }

    const perksOps = [];
    perks.map(perk => {
      if (perk.applyType === rewardTierPerkApplyType.CHOOSE) {
        perksOps.push(
          this.increment(customerId, rewardId, perk.type, perk.value)
        );
      }
      return perk;
    });
    await Promise.all(perksOps);
    return true;
  }

  async getRewardsTierDetails(customerId, brandId) {
    const query = await this.roDb(this.viewName)
      .select('*')
      .where('customer_id', customerId)
      .join(
        'brands_rewards',
        'brands_rewards.reward_id',
        `${this.viewName}.reward_id`
      )
      .andWhere('brands_rewards.brand_id', brandId);
    addLocalizationField(query, 'tierTitle');
    const queryResult = query.filter(
      x =>
        moment(x.created).valueOf() ===
        Math.max(...query.map(x => moment(x.created).valueOf()))
    );
    const retVal = {};
    if (queryResult && queryResult.length !== 0) {
      retVal.tierTitle = queryResult[0].tierTitle;
      retVal.logoUrl = queryResult[0].logoUrl;
      retVal.rewardId = queryResult[0].rewardId;
      const perks = await Promise.all(
        queryResult.map(async elem => {
          const { title } = this.context.customer.customTitleName(
            elem.perksType
          );
          const perk = {};
          perk.perkId = elem.perkId;
          perk.perksApplyType = elem.perksApplyType;
          perk.perksType = elem.perksType;
          perk.perksTitle = title;
          if (elem.perksType === rewardTierPerkType.DISCOUNT) {
            perk.perksValue = elem.perksValue;
          } else {
            const valueQuery = await this.roDb(this.tableName)
              .select('total')
              .where('customer_id', customerId)
              .andWhere('reward_id', elem.rewardId)
              .andWhere('type', elem.perksType)
              .orderBy('total', 'asc')
              .orderBy('updated', 'desc');
            perk.perksValue = valueQuery
              ? valueQuery[0].total
              : elem.perksValue;
          }
          return perk;
        })
      );
      retVal.perks = filter(perks, elem => toInteger(elem.perksValue) !== 0);
    }
    return retVal || [];
  }

  async decrement(customerId, rewardId, type, value = 0) {
    if (!customerId || !rewardId || !type) {
      return false;
    }
    const customerPerk = first(
      await this.getByCustomerId(customerId)
        .where('reward_id', rewardId)
        .where('type', type)
        .orderBy('total', 'asc')
        .orderBy('updated', 'desc')
    ) || { total: 0, customerId, rewardId, type };
    const totalValue = parseFloat(
      parseFloat(customerPerk.total) - parseFloat(value)
    );
    return this.save({
      ...customerPerk,
      total: totalValue >= 0 ? totalValue : 0,
    });
  }

  async removePerks(customerId, rewardId, perks) {
    if (!customerId || !rewardId) {
      return false;
    }

    const perksOps = [];
    perks.map(perk => {
      if (perk.applyType === rewardTierPerkApplyType.CHOOSE) {
        perksOps.push(
          this.decrement(customerId, rewardId, perk.type, perk.value)
        );
      }
      return perk;
    });
    await Promise.all(perksOps);
    return true;
  }
}

module.exports = CustomerPerk;
