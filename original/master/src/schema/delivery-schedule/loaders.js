const DataLoader = require('dataloader');
const { map } = require('lodash');

function createLoaders(model) {
  return {
    byLocation: new DataLoader(async brandLocationIds => {
      const schedules = await model
        .db(model.tableName)
        .whereIn('brand_location_id', brandLocationIds);
      return map(brandLocationIds, brandLocationId =>
        schedules.filter(
          schedule => schedule.brandLocationId === brandLocationId
        )
      );
    }),
  };
}

module.exports = { createLoaders };
