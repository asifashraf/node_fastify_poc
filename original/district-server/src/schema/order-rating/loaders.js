const DataLoader = require('dataloader');
const { map, first } = require('lodash');
function createLoaders(model) {
  return {
    byOrderSet: new DataLoader(async orderSetIds => {
      const rating = await model
        .db('order_rating')
        .select('*')
        .whereIn('order_rating.order_set_id', orderSetIds);

      return map(orderSetIds, orderSetId =>
        first(rating.filter(item => item.orderSetId === orderSetId))
      );
    }),
    byBrandLocationId: new DataLoader(async brandLocationIds => {
      const branchScores = await model
        .db('brand_location_score')
        .whereIn('brand_location_id', brandLocationIds);
      return map(brandLocationIds, brandLocationId =>
        first(branchScores.filter(item => item.brandLocationId === brandLocationId))
      ).map(item => {
        return item ? item.totalScore / item.totalReviews : 0;
      });
    }),
  };
}

module.exports = { createLoaders };
