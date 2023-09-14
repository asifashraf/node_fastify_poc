const DataLoader = require('dataloader');
const { map, groupBy, find } = require('lodash');
const { addLocalizationField } = require('../../lib/util');

function createLoaders(model) {
  return {
    location: new DataLoader(async brandIds => {
      const brandLocations = addLocalizationField(
        await model
          .db('brand_locations')
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
          .join('brands', 'brands.id', 'brand_locations.brand_id')
          .orderBy('brands.name')
          .whereIn('brand_locations.brand_id', brandIds),
        'name'
      );
      const grouped = groupBy(brandLocations, 'brandId');
      return map(brandIds, brandId =>
        (grouped[brandId]
          ? grouped[brandId].sort((a, b) =>
            (a.name > b.name ? -1 : a.name < b.name ? 1 : 0)
          )
          : [])
      );
    }),
    currency: new DataLoader(async brandIds => {
      const currencies = await model
        .db('currencies')
        .join('countries', 'countries.currency_id', 'currencies.id')
        .join('brands', 'brands.country_id', 'countries.id')
        .select('currencies.*', 'brands.id as brand_id')
        .whereIn('brands.id', brandIds);
      return map(brandIds, brandId =>
        find(currencies, currency => currency.brandId === brandId)
      );
    }),
  };
}

module.exports = { createLoaders };
