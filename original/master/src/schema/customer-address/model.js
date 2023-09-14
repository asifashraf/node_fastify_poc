const BaseModel = require('../../base-model');
const { first, omit, extend, get } = require('lodash');
const {
  transformToCamelCase,
  addLocalizationField,
} = require('../../lib/util');
const { customerAddressError } = require('../root/enums');
const { getExtraFields } = require('../customer/utils');
const { orderFulfillmentTypes } = require('../order-set/enums');

class CustomerAddress extends BaseModel {
  constructor(db, context) {
    super(db, 'customer_addresses', context);
  }

  async getById(id) {
    const result = await this.db
      .table(this.tableName)
      .select(
        this.db.raw(
          'customer_addresses.*, ST_X(geolocation) as longitude, ST_Y(geolocation) as latitude'
        )
      )
      .where('id', id)
      .then(transformToCamelCase)
      .then(first);
    if (result && result.countryCode)
      result.extraFields = await getExtraFields(
        addLocalizationField(
          await this.db('customer_addresses_fields')
            .join(
              'countries',
              'customer_addresses_fields.country_id',
              'countries.id'
            )
            .select('customer_addresses_fields.*')
            .where('iso_code', result.countryCode)
            .orderBy('order', 'asc')
            .then(transformToCamelCase),
          'title'
        ),
        result.dynamicData
      );
    return result;
  }

  async getCountryByAddressId(addressId) {
    const result = await this.db
      .table(this.tableName)
      .select('countries.*')
      .join(
        'neighborhoods',
        'neighborhoods.id',
        'customer_addresses.neighborhood_id'
      )
      .join('cities', 'cities.id', 'neighborhoods.city_id')
      .join('countries', 'countries.id', 'cities.country_id')
      .where('customer_addresses.id', addressId)
      .then(transformToCamelCase)
      .then(first);

    return result;
  }

  async getCountryFromCountryCodeByAddressId(addressId) {
    const result = await this.db
      .table(this.tableName)
      .select('countries.*')
      .join(
        'countries',
        'countries.iso_code',
        'customer_addresses.country_code'
      )
      .where('customer_addresses.id', addressId)
      .then(transformToCamelCase)
      .then(first);

    return result;
  }

  async addExtraFields(addresses) {
    const addressFields = addLocalizationField(
      await this.db('customer_addresses_fields')
        .join(
          'countries',
          'customer_addresses_fields.country_id',
          'countries.id'
        )
        .select('customer_addresses_fields.*', 'countries.iso_code')
        .orderBy('order', 'asc')
        .then(transformToCamelCase),
      'title'
    );
    return addresses.map(address => {
      return {
        ...address,
        extraFields: getExtraFields(
          addressFields.filter(field => field.isoCode === address.countryCode),
          address.dynamicData
        ),
      };
    });
  }

  getByCustomer(customerId) {
    return this.db
      .table(this.tableName)
      .select(
        this.db.raw(
          'customer_addresses.*, ST_X(geolocation) as longitude, ST_Y(geolocation) as latitude'
        )
      )
      .where('customer_id', customerId)
      .then(transformToCamelCase)
      .then(addresses => this.addExtraFields(addresses));
  }

  async getByBrandLocationFulfillmentRadius(brandLocationId, fulfillmentType) {
    const {
      longitude, latitude, deliveryRadius, expressDeliveryRadius
    } = await this.context.brandLocation.getWithAddress(brandLocationId);
    let radius = 0;
    switch (fulfillmentType) {
      case orderFulfillmentTypes.DELIVERY:
        radius = Number(deliveryRadius) * 1000;
        break;
      case orderFulfillmentTypes.EXPRESS_DELIVERY:
        radius = Number(expressDeliveryRadius) * 1000;
        break;
    }
    return this.db
      .table(this.tableName)
      .select(
        this.db.raw(`
        customer_addresses.*,
        ST_X(geolocation) as longitude,
        ST_Y(geolocation) as latitude
        `)
      )
      .where('customer_id', this.context.auth.id)
      .where(
        this.roDb.raw(`
        ST_DWithin(
          ST_Transform(customer_addresses.geolocation, 7094),
          ST_Transform(
            ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326),
            7094
          ),
          :radius
        )
        `, {longitude, latitude, radius})
      )
      .then(transformToCamelCase)
      .then(addresses => this.addExtraFields(addresses));
  }

  async getDefaultByCustomer(customerId) {
    const result = await this.db
      .table(this.tableName)
      .select(
        this.db.raw(
          'customer_addresses.*, ST_X(geolocation) as longitude, ST_Y(geolocation) as latitude'
        )
      )
      .where('customer_id', customerId)
      .andWhere('is_default', true)
      .then(transformToCamelCase)
      .then(first);
    if (result) {
      result.extraFields = getExtraFields(
        addLocalizationField(
          await this.db('customer_addresses_fields')
            .join(
              'countries',
              'customer_addresses_fields.country_id',
              'countries.id'
            )
            .select('customer_addresses_fields.*')
            .where('iso_code', result.countryCode)
            .orderBy('order', 'asc')
            .then(transformToCamelCase),
          'title'
        ),
        result.dynamicData
      );
    }

    return result;
  }

  async deleteAddress(customerId, addressId) {
    return this.db('customer_addresses')
      .where({
        id: addressId,
      })
      .delete();
  }

  async setDefaultAddress(customerAddress) {
    // Set the old default to false
    await this.db(this.tableName)
      .where('customer_id', customerAddress.customerId)
      .update({
        isDefault: false,
      });

    return super.save(extend({}, customerAddress, { isDefault: true }));
  }

  async save(customerAddress) {
    if (get(customerAddress, 'isDefault', false)) {
      // Set the old default to false
      await this.db(this.tableName)
        .where('customer_id', customerAddress.customerId)
        .update({
          isDefault: false,
        });
    }
    customerAddress.dynamicData = customerAddress.extraFields
      ? customerAddress.extraFields.reduce((a, v) => {
        a[v.id] = v.value;
        return a;
      }, {})
      : null;

    if (customerAddress && customerAddress.neighborhoodId) {
      const n = await this.context.neighborhood.getById(
        customerAddress.neighborhoodId
      );
      if (!n) {
        customerAddress.neighborhoodId = null;
      }
    }
    return super.save(
      extend(
        {},
        omit(customerAddress, ['latitude', 'longitude', 'extraFields']),
        {
          geolocation: this.db.raw(
            `ST_GeomFromText('POINT(${customerAddress.longitude} ${customerAddress.latitude})', 4326)`
          ),
        }
      )
    );
  }

  async validate(customerAddress) {
    const errors = [];
    const isValidCustomer = await this.context.customer.isValid(
      customerAddress.customerId
    );
    const isValid = await this.isValid(customerAddress);

    if (!isValidCustomer) {
      errors.push(customerAddressError.INVALID_CUSTOMER);
    }

    if (!isValid) {
      errors.push(customerAddressError.INVALID_ADDRESS);
    }

    if (customerAddress.id !== undefined && customerAddress.id !== null) {
      const isValidCombination = await this.db
        .table(this.tableName)
        .where('id', customerAddress.id)
        .andWhere('customer_id', customerAddress.customerId)
        .then(first);

      if (!isValidCombination) {
        errors.push(customerAddressError.INVALID_CUSTOMER_ADDRESS);
      }
    }

    return errors;
  }
}

module.exports = CustomerAddress;
