const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const { first, extend } = require('lodash');
const moment = require('moment');
const { transformToCamelCase } = require('../../lib/util');
const { googleMapsApiKey } = require('./../../../config');
const nodeGeocoder = require('node-geocoder');

class CustomerCurrentLocationCache extends BaseModel {
  constructor(db, context) {
    super(db, 'customer_current_location_cache', context);
    this.loaders = createLoaders(this);
  }

  getById(id) {
    return this.db
      .table(this.tableName)
      .select(
        this.db.raw(
          'customer_current_location_cache.*, ST_X(geolocation) as longitude, ST_Y(geolocation) as latitude'
        )
      )
      .where('id', id)
      .then(transformToCamelCase)
      .then(first);
  }

  async getLocationFromGoogleMap({ latitude, longitude }) {
    const options = {
      provider: 'openstreetmap',
      // Optional depending on the providers
      apiKey: googleMapsApiKey, // for Mapquest, OpenCage, Google Premier
      // formatter: 'string', // 'gpx', 'string', ...
    };

    const geoCoder = nodeGeocoder(options);
    try {
      const location = first(
        await geoCoder.reverse({ lat: latitude, lon: longitude })
      );
      if (location) {
        let { formattedAddress: line1, streetName } = location;

        line1 = line1 || '';
        streetName = streetName || '';
        if (line1 === '' && streetName !== '') {
          line1 = streetName;
        }

        return { latitude, longitude, line1 };
      }
      console.log('current location not found with given inputs');

      return null;
    } catch (err) {
      console.log('err', err);
      return null;
    }
  }

  async getLatestCurrentLocation(customerId, input) {
    let currentLocation = await this.findByCustomerId(customerId, input);
    let mapLocation;
    if (currentLocation && moment().isAfter(currentLocation.expireAt)) {
      mapLocation = await this.getLocationFromGoogleMap(input);
      if (mapLocation && mapLocation.line1) {
        await this.save({ ...mapLocation, ...{ customerId } });
        currentLocation = await this.findByCustomerId(customerId, input);
      }
    } else if (!currentLocation) {
      mapLocation = await this.getLocationFromGoogleMap(input);
      if (mapLocation && mapLocation.line1) {
        await this.save({ ...mapLocation, ...{ customerId } });
        currentLocation = await this.findByCustomerId(customerId, input);
      }
    }

    return currentLocation;
  }

  async findByCustomerId(customerId, { longitude, latitude }) {
    const cache = await this.db
      .table(this.tableName)
      .select(
        this.db.raw(
          `customer_current_location_cache.*, ST_X(geolocation) as longitude, ST_Y(geolocation) as latitude,
          ROUND(
            (
              ST_Distance(
                ST_Transform(customer_current_location_cache.geolocation,7094),
                ST_Transform(ST_SetSRID(ST_Makepoint(${longitude}, ${latitude}),4326),7094)
              )
            )::numeric,2
          ) distance
          `
        )
      )
      .where('customer_id', customerId)
      .andWhereRaw(
        `ST_DWithin(
          ST_Transform(customer_current_location_cache.geolocation, 7094),
          ST_Transform(ST_SetSRID(ST_MakePoint('${longitude}', '${latitude}'), 4326), 7094),
          50
        )`
      )
      .orderBy('updated', 'desc')
      .orderBy('distance', 'asc')
      .limit(1)
      .then(transformToCamelCase)
      .then(first);
    return cache;
  }

  async save(input) {
    const current = await this.findByCustomerId(input.customerId, input);
    const payload = {
      customerId: input.customerId,
      line1: input.line1,
      expireAt: moment().add(4, 'weeks'),
    };

    if (current) {
      payload.id = current.id;
    }
    const currentLocationId = await super.save(
      extend({}, payload, {
        geolocation: this.db.raw(
          `ST_GeomFromText('POINT(${input.longitude} ${input.latitude})', 4326)`
        ),
      })
    );
    const currentLocation = await this.getById(currentLocationId);
    return { currentLocation };
  }
}

module.exports = CustomerCurrentLocationCache;
