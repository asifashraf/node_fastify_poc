const BaseModel = require('../../base-model');
const { first, omit, extend, get } = require('lodash');
const {
  transformToCamelCase,
  addLocalizationField,
} = require('../../lib/util');
const { customerAddressError } = require('../root/enums');
const { getExtraFields } = require('../customer/utils');
const { orderFulfillmentTypes } = require('../order-set/enums');
const { customerAddressType } = require('./enums');

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

  async isCustomerInDeliverySphere(brandLocationId, location) {
    const customerAddressStatus = [];
    const brandLocation = await this.roDb(`${this.context.brandLocation.tableName} as bl`)
      .select(
        this.db.raw(`
          bl.id,
          bl.delivery_radius,
          ST_X(bla.geolocation) as longitude,
          ST_Y(bla.geolocation) as latitude
        `)
      )
      .leftJoin(`${this.context.brandLocationAddress.tableName} as bla`, 'bl.id', 'bla.brand_location_id')
      .where('bl.id', brandLocationId)
      .first();

    if (brandLocation) {
      if (this.context.auth.id) {
        const addresses = await this.roDb(`${this.tableName} as ca`)
          .select(
            this.db.raw(`
              ca.id,
              ST_X(ca.geolocation) as longitude,
              ST_Y(ca.geolocation) as latitude,
              case when ROUND(
                (ST_DistanceSphere(
                  ca.geolocation,
                  ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)
                ))::numeric
              ) <= :deliveryRadius * 1000 then true else false end as address_in_zone
              `, {
              longitude: brandLocation.longitude,
              latitude: brandLocation.latitude,
              deliveryRadius: Number(brandLocation.deliveryRadius)
            }
            )
          )
          .where('ca.customer_id', this.context.auth.id);
        addresses.map(address => {
          customerAddressStatus.push({
            status: address.addressInZone,
            type: customerAddressType.STATIC,
            addressId: address.id,
            label: address.addressInZone ? null : {
              en: 'Address is out with delivery zone',
              ar: 'العنوان يقع خارج نطاق التوصيل',
            },
          });
        });
      }
      if (location) {
        const { longitude, latitude } = location;
        const {locationInZone} = await this.db.select(
          this.db.raw(`
            case when ROUND(
              (ST_DistanceSphere(
                ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326),
                ST_SetSRID(ST_MakePoint(:longitudeBrandLocation, :latitudeBrandLocation), 4326)
              ))::numeric
            ) <= :deliveryRadius * 1000 then true else false end as location_in_zone     
          `, {
            longitude,
            latitude,
            longitudeBrandLocation: brandLocation.longitude,
            latitudeBrandLocation: brandLocation.latitude,
            deliveryRadius: Number(brandLocation.deliveryRadius)
          })
        )
          .first();
        customerAddressStatus.push({
          status: locationInZone,
          type: customerAddressType.DYNAMIC,
          addressId: null,
          label: locationInZone ? null : {
            en: 'Address is out with delivery zone',
            ar: 'العنوان يقع خارج نطاق التوصيل',
          },
        });
      }
      return customerAddressStatus;
    }
    return [];
  }

  async isCustomerInExpressDeliveryZone(brandLocationId, location) {
    const customerAddressStatus = [];
    const brandLocation = await this.roDb(`${this.context.brandLocationAddress.tableName} as bla`)
      .select(
        this.db.raw(`
          bla.express_delivery_zone
        `)
      )
      .where('bla.brand_location_id', brandLocationId)
      .first();

    if (brandLocation && brandLocation.expressDeliveryZone) {
      if (this.context.auth.id) {
        const addresses = await this.roDb(`${this.tableName} as ca`)
          .select(
            this.db.raw(`
              ca.id,
              ST_X(ca.geolocation) as longitude,
              ST_Y(ca.geolocation) as latitude,
              case when (ST_Contains(
                  :expressDeliveryZone,
                  ca.geolocation
                ))
              then true else false end as address_in_zone
              `, {
              expressDeliveryZone: brandLocation.expressDeliveryZone,
            }
            )
          )
          .where('ca.customer_id', this.context.auth.id);
        addresses.map(address => {
          customerAddressStatus.push({
            status: address.addressInZone,
            type: customerAddressType.STATIC,
            addressId: address.id,
            label: address.addressInZone ? null : {
              en: 'Address is out with express delivery zone',
              ar: 'العنوان يقع خارج نطاق التوصيل',
            },
          });
        });
      }
      if (location) {
        const { longitude, latitude } = location;
        const {locationInZone} = await this.db.select(
          this.db.raw(`
            case when (ST_Contains(
              :expressDeliveryZone,
              ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)
            )) then true else false end as location_in_zone     
          `, {
            expressDeliveryZone: brandLocation.expressDeliveryZone,
            longitude,
            latitude,
          })
        )
          .first();
        customerAddressStatus.push({
          status: locationInZone,
          type: customerAddressType.DYNAMIC,
          addressId: null,
          label: locationInZone ? null : {
            en: 'Address is out with express delivery zone',
            ar: 'العنوان يقع خارج نطاق التوصيل',
          },
        });
      }
      return customerAddressStatus;
    }
    return [];
  }
}

module.exports = CustomerAddress;
