const BaseModel = require('../../base-model');
const { first, isUndefined, forEach } = require('lodash');
const {
  transformToCamelCase,
  addLocalizationField,
} = require('../../lib/util');
const { getExtraFields } = require('../customer/utils');
const { createLoaders } = require('./loaders');

class DeliveryAddress extends BaseModel {
  constructor(db, context) {
    super(db, 'delivery_addresses', context);
    this.loaders = createLoaders(this);
  }

  getQuery() {
    return this.db
      .table(this.tableName)
      .select(
        this.db.raw(
          'delivery_addresses.*, ST_X(geolocation) as longitude, ST_Y(geolocation) as latitude'
        )
      );
  }

  async getById(addressId) {
    const result = await this.getQuery()
      .where('id', addressId)
      .then(transformToCamelCase)
      .then(first);

    if (result)
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
    return result;
  }

  async getFormattedDeliveryAddress(orderFulfillmentId) {
    const deliveryAddress = await this.getByOrderFulfillmentId(orderFulfillmentId);
    deliveryAddress.extraFields = await deliveryAddress.extraFields;
    const dynamicFields = Object.keys(deliveryAddress.dynamicData);
    const formattedAddress = {
      latitude: deliveryAddress.latitude,
      longitude: deliveryAddress.longitude,
      name: deliveryAddress.friendlyName,
      countryCode: deliveryAddress.countryCode,
      city: deliveryAddress.city,
      addressFields: []
    };
    for (const field of dynamicFields) {
      const fieldIndex = deliveryAddress.extraFields.findIndex(x => x.id === field);
      if (fieldIndex !== -1) {
        const fieldData = deliveryAddress.extraFields[fieldIndex];
        formattedAddress.addressFields.push(`${fieldData.name.en}: ${fieldData.value}`);
      }
    }
    return formattedAddress;
  }

  async getByOrderFulfillmentId(orderFulfillmentId) {
    const result = await this.getQuery()
      .where('order_fulfillment_id', orderFulfillmentId)
      .then(transformToCamelCase)
      .then(first);

    if (result)
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

    return result;
  }

  async getAddrByOrderFulfillmentId(orderFulfillmentId, countryCode) {
    const result = await this.db
      .table(this.tableName)
      .select(
        this.db.raw(
          'delivery_addresses.*, ST_X(geolocation) as longitude, ST_Y(geolocation) as latitude, neighborhoods.name as neighborhood, cities.name as cityOld'
        )
      )
      .leftJoin(
        'neighborhoods',
        'neighborhoods.id',
        'delivery_addresses.neighborhood_id'
      )
      .leftJoin('cities', 'cities.id', 'neighborhoods.city_id')
      .where('order_fulfillment_id', orderFulfillmentId)

      .then(transformToCamelCase)
      .then(first);

    const extraFields = await this.db('customer_addresses_fields')
      .join('countries', 'customer_addresses_fields.country_id', 'countries.id')
      .select('customer_addresses_fields.*')
      .where('iso_code', countryCode)
      .orderBy('order', 'asc')
      .then(transformToCamelCase);

    if (result && result.dynamicData) {
      if (
        typeof result.dynamicData === 'string' ||
        result.dynamicData instanceof String
      ) {
        try {
          result.dynamicData = JSON.parse(result.dynamicData);
        } catch (err) {
          console.log('error in parsing dynamic data');
          result.dynamicData = {};
        }
      }
    }

    const dynamicData = result.dynamicData || {};

    const newFields = {};
    forEach(extraFields, f => {
      if (!isUndefined(dynamicData[f.id])) {
        newFields[f.type] = dynamicData[f.id];
      }
    });

    result.dynamicData = newFields;
    return result;
  }
}

module.exports = DeliveryAddress;
