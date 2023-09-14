const BaseModel = require('../../base-model');


class RewardTierPerkMenuItem extends BaseModel {
  constructor(db, context) {
    super(db, 'reward_tier_perks_menu_items', context);
  }

  getQueryByFilters(filters) {
    let query = this.db(this.tableName);
    if (filters) {
      query = query.andWhere(filters);
    }

    return query;
  }
}


module.exports = RewardTierPerkMenuItem;
