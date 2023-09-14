const DataLoader = require('dataloader');
const { map } = require('lodash');

function createLoaders(model) {
  return {
    byTierId: new DataLoader(async tierIds => {
      const perks = await model
        .roDb('reward_tier_perks')
        .select('*')
        .whereIn('reward_tier_id', tierIds)
        .orderBy('sort_order', 'asc');

      return map(tierIds, tierId => {
        const allPerks = perks.filter(item => item.rewardTierId === tierId);
        return allPerks;
      });
    }),
  };
}

module.exports = { createLoaders };
