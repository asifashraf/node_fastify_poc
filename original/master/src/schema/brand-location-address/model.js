/* eslint-disable max-params */
const BaseModel = require('../../base-model');
const { first, omit, extend } = require('lodash');
const { transformToCamelCase } = require('../../lib/util');

class BrandLocationAddress extends BaseModel {
  constructor(db) {
    super(db, 'brand_location_addresses');
  }

  getById(id) {
    return this.roDb
      .table(this.tableName)
      .select(
        this.roDb.raw(
          'brand_location_addresses.*, ST_X(geolocation) as longitude, ST_Y(geolocation) as latitude'
        )
      )
      .where('id', id)
      .then(transformToCamelCase)
      .then(first);
  }

  getByBrandLocation(brandLocationId) {
    return this.roDb
      .table(this.tableName)
      .select(
        this.roDb.raw(
          'brand_location_addresses.*, ST_X(geolocation) as longitude, ST_Y(geolocation) as latitude'
        )
      )
      .where('brand_location_id', brandLocationId)
      .then(transformToCamelCase)
      .then(first);
  }

  getFullByBrandLocation(brandLocationId) {
    return this.roDb
      .table(this.tableName)
      .select(
        this.roDb.raw(
          'brand_location_addresses.*, ST_X(geolocation) as longitude, ST_Y(geolocation) as latitude, neighborhoods.name as neighborhood, cities.name as city, countries.name as country'
        )
      )
      .leftJoin(
        'neighborhoods',
        'neighborhoods.id',
        'brand_location_addresses.neighborhood_id'
      )
      .leftJoin('cities', 'cities.id', 'neighborhoods.city_id')
      .leftJoin('countries', 'countries.id', 'cities.country_id')
      .where('brand_location_id', brandLocationId)
      .then(transformToCamelCase)
      .then(first);
  }

  async save(address) {
    return super.save(
      extend({}, omit(address, ['latitude', 'longitude']), {
        shortAddress: '',
        shortAddressAr: '',
        shortAddressTr: '',
        geolocation: this.db.raw(
          `ST_GeomFromText('POINT(${address.longitude} ${address.latitude})', 4326)`
        ),
      })
    );
  }
}

module.exports = BrandLocationAddress;
