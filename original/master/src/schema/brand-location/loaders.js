const DataLoader = require('dataloader');
const { map, first } = require('lodash');

function createLoaders(model) {
  return {
    byId: new DataLoader(async brandLocationIds => {
      const brandLocations = await model
        .db(model.tableName)
        .select(
          model.db.raw(`
          brand_locations.*,
          brand_location_addresses.id as brand_location_address_id,
          brand_location_addresses.short_address,
          brand_location_addresses.short_address_ar,
          brand_location_addresses.short_address_tr,
          brand_location_addresses.neighborhood_id,
          brand_location_addresses.street,
          brand_location_addresses.city,
          brand_location_addresses.city_id,
          ST_X(brand_location_addresses.geolocation) as longitude,
          ST_Y(brand_location_addresses.geolocation) as latitude`)
        )
        .join(
          'brand_location_addresses',
          'brand_location_addresses.brand_location_id',
          'brand_locations.id'
        )
        .whereIn('brand_locations.id', brandLocationIds);

      return map(brandLocationIds, brandLocationId =>
        first(
          brandLocations.filter(location => location.id === brandLocationId)
        )
      );
    }),
  };
}

module.exports = { createLoaders };
