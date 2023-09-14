const DataLoader = require('dataloader');
const { map, orderBy } = require('lodash');

function createLoaders(model) {
  return {
    byBrand: new DataLoader(async brandIds => {
      const allBrandRewards = model
        .roDb('brands_rewards')
        .select(
          model.roDb.raw(
            `${model.tableName}.*, brands_rewards.brand_id as tiers_and_perks_brand_id`
          )
        )
        .innerJoin(
          this.tableName,
          'brands_rewards.reward_id',
          `${model.tableName}.id`
        )
        .whereIn('brands_rewards.brand_id', brandIds);
      return map(brandIds, brandId => {
        const brandRewards = allBrandRewards.filter(
          item => item.tiersAndPerksBrandId === brandId
        );
        return orderBy(brandRewards, ['created'], ['desc']);
      });
    }),
  };
}

module.exports = { createLoaders };
