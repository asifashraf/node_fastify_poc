const { omit } = require('lodash');

const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');

class PickupLocation extends BaseModel {
  constructor(db, context) {
    super(db, 'pickup_locations', context);
    this.loaders = createLoaders(this);
  }

  filterPickupLocations(query, filters = {}) {
    if (Object.keys(filters).length === 0) {
      return query;
    }
    if (filters.brandIds && filters.brandIds.length > 0) {
      query.whereIn('brand_id', filters.brandIds);
    }

    if (filters.cityId) {
      query.where('city_id', filters.cityId);
    }
    if (filters.neighborhoodId) {
      query.where('neighborhood_id', filters.neighborhoodId);
    }

    if (filters.searchText) {
      query.where('pickup_locations.name', 'ILIKE', `%${filters.searchText}%`);
    }

    if (filters.countryId) {
      query
        .leftJoin('brands', `${this.tableName}.brand_id`, 'brands.id')
        .where('brands.country_id', filters.countryId);
    }

    if (filters.status) {
      query.where('pickup_locations.status', filters.status);
    }
    return query;
  }

  async getAll(filters) {
    let query = super
      .getAll()
      .select(
        this.db.raw(`${this.tableName}.*,
        ST_X(${this.tableName}.geolocation) as longitude,
        ST_Y(${this.tableName}.geolocation) as latitude`)
      )
      .from(this.tableName);
    if (filters) {
      query = this.filterPickupLocations(query, filters);
    }
    return query;
  }

  getById(id) {
    if (!id) return id;
    return this.loaders.byId.load(id);
  }

  async getByBrand(brandId) {
    return this.getAll().where({ brandId });
  }

  async save(locationInput) {
    const input = omit(locationInput, ['latitude', 'longitude']);
    input.geolocation = this.db.raw(
      `ST_GeomFromText('POINT(${locationInput.longitude} ${locationInput.latitude})', 4326)`
    );
    return super.save(input);
  }

  async changeStatus(locationId, locationStatus) {
    const location = { id: locationId, status: locationStatus };
    await super.save(location);
    return this.getById(locationId);
  }

  // async validate(input) {
  //   const errors = [];
  //   return errors;
  // }
}

module.exports = PickupLocation;
