const DataLoader = require('dataloader');
const { map } = require('lodash');

function createLoaders(model) {
  return {
    byLocation: new DataLoader(async brandLocationIds => {
      const neighborhoods = await model
        .db('neighborhoods')
        .select(
          'neighborhoods.*',
          'brand_locations_neighborhoods.brand_location_id'
        )
        .join(
          'brand_locations_neighborhoods',
          'brand_locations_neighborhoods.neighborhood_id',
          'neighborhoods.id'
        )
        .whereIn(
          'brand_locations_neighborhoods.brand_location_id',
          brandLocationIds
        );

      return map(brandLocationIds, brandLocationId =>
        neighborhoods.filter(
          neighborhood => neighborhood.brandLocationId === brandLocationId
        )
      );
    }),
  };
}

module.exports = { createLoaders };
