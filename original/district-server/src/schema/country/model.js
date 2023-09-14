const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const { countryCreateError, statusTypes, reverseAddressError } = require('../root/enums');
const { find } = require('lodash');
const {
  addLocalizationField,
  transformToCamelCase,
  formatError,
} = require('../../lib/util');
const {
  redisTimeParameter,
  googleMapsReverseGeocodeApiKey,
} = require('../../../config');
const Axios = require('axios');
class Country extends BaseModel {
  constructor(db, context) {
    super(db, 'countries', context);
    this.loaders = createLoaders(this);
  }

  filterCountries(query, filters) {
    if (typeof filters.status === 'undefined') {
      filters.status = 'ALL';
    }
    if (filters.status !== 'ALL') {
      query.where('countries.status', filters.status);
    }

    if (filters.searchText) {
      filters.searchText = filters.searchText.toLowerCase().trim();
      query.whereRaw(
        '(LOWER(countries.name) like ? or countries.name_ar like ? or countries.name_tr like ? or LOWER(countries.iso_code) LIKE ? )'
        , [`%${filters.searchText}%`, `%${filters.searchText}%`, `%${filters.searchText}%`, `%${filters.searchText}%`],
      );
    }
    return query;
  }

  async getTimezoneIdentifier(countryId) {
    const query = this.roDb(this.tableName)
      .select('time_zone_identifier')
      .where('id', countryId);
    const [object] = await this.context.sqlCache(
      query,
      redisTimeParameter.oneDayInSeconds
    );
    if (object) {
      return object.timeZoneIdentifier;
    }
    return null;
  }

  async getByCode(code, filters = {}) {
    code = (code || '').toUpperCase();
    let query = this.roDb(this.tableName).where('iso_code', code);
    query = this.filterCountries(query, filters);
    const country = addLocalizationField(
      await this.context.sqlCache(query, redisTimeParameter.oneHourInSeconds),
      'name'
    );
    return country ? country[0] : null;
  }

  async getById(id) {
    const query = this.roDb(this.tableName).where('id', id);
    const country = addLocalizationField(
      await this.context.sqlCache(query, redisTimeParameter.oneHourInSeconds),
      'name'
    );
    return country ? country[0] : null;
  }

  async getAll(filters) {
    let query = super.getAll();

    query = this.filterCountries(query, filters);

    return addLocalizationField(
      await this.context.sqlCache(query, redisTimeParameter.oneHourInSeconds),
      'name'
    );
  }

  async getAllActive() {
    return addLocalizationField(
      await super.getAll().where('status', statusTypes.ACTIVE),
      'name'
    );
  }

  async getByCurrencyId(currencyId) {
    return addLocalizationField(
      await super
        .getAll()
        .where('currency_id', currencyId)
        .first(),
      'name'
    );
  }

  async getByIsoCode(iso) {
    iso = (iso || '').toUpperCase();
    return addLocalizationField(
      await super
        .getAll()
        .where('iso_code', iso)
        .first(),
      'name'
    );
  }

  async getActiveByIsoCode(iso) {
    iso = (iso || '').toUpperCase();
    return this.roDb(this.tableName)
      .where('iso_code', iso)
      .andWhere('status', 'ACTIVE')
      .first();
  }

  async getByCityId(cityId) {
    const city = await this.context.city.getById(cityId);
    return this.getById(city.countryId);
  }

  async validate(countryInput) {
    const errors = [];

    const currency = await this.context.currency.getById(
      countryInput.currencyId
    );

    if (!currency) {
      errors.push(countryCreateError.INVALID_CURRENCY);
    }
    const countries = await this.roDb(this.tableName).whereRaw(
      `(countries.name ILIKE '${countryInput.name}' or countries.iso_code ILIKE '${countryInput.isoCode}' )`
    );

    if (countries.length > 1) {
      errors.push(countryCreateError.ALREADY_EXISTS);
    } else if (countries.length === 1 && (!countryInput.id || countries[0].id !== countryInput.id)) {
      errors.push(countryCreateError.ALREADY_EXISTS);
    }

    return errors;
  }

  async getCountryCurrencyLookup() {
    const query = `select
                  c.id as country_id ,
                  c.iso_code as country_iso_code,
                  c."name" as country_name,
                  c."name_ar" as country_name_ar,
                  c."name_tr" as country_name_tr,
                  c.dial_code as country_dial_code,
                  c.locations_radius as country_locations_radius,
                  c.delivery_fee as country_delivery_fee,
                  c.service_fee as country_service_fee,
                  c.service_phone_number as country_service_phone_number,
                  c.vat as country_vat,
                  c.vat_id as country_vat_id,
                  c.is_referral_active,
                  c.sender_referral_amount,
                  c.receiver_referral_amount,
                  c.minimum_delivery_order_amount,
                  c.flag_photo,
                  cur.id as currency_id,
                  cur."name" as currency_name,
                  cur.iso_code as currency_iso_code,
                  cur.symbol as currency_symbol,
                  cur.symbol_ar as currency_symbol_ar,
                  cur.symbol_tr as currency_symbol_tr,
                  cur.subunit_name as currency_subunit_name,
                  cur.subunit_name_ar as currency_subunit_name_ar,
                  cur.subunit_name_tr as currency_subunit_name_tr,
                  cur.decimal_place as currency_decimal_place,
                  cur.lowest_denomination as currency_lowest_denomination
                  from countries c
                  join currencies cur on c.currency_id = cur.id
                  where c.status ='ACTIVE' and cur.status = 'ACTIVE'`;
    // Talk about bad localization design :/
    return addLocalizationField(
      addLocalizationField(
        addLocalizationField(
          await this.roDb
            .raw(query)
            .then(result => transformToCamelCase(result.rows)),
          'countryName'
        ),
        'currencySymbol'
      ),
      'currencySubunitName'
    );
  }

  async validateGeocoding(geocodingInput) {
    /**
     * For this validation there are 2 ways
     * First one is Geocoding MS, second one is new db field(MultiPolygon)
     * Geocoding MicroService is not running that why we can not use
     * Second way is already update db and call with location.
     * That's why we ignored validation part
     */
    const errors = [];
    /*
    const query = this.roDb(this.tableName)
      .where('status', statusTypes.ACTIVE)
      .WhereRaw(`ST_Intersects(geom, ST_SetSRID(ST_Point(${geocodingInput.longitude},${geocodingInput.latitude}), 4326))`);
    const country = await query;
    if (isEmpty(country)) {
      errors.push(reverseAddressError.OUT_OF_SERVICE_COUNTRY);
    }
    */
    return errors;
  }

  async getAddressFromGeocoding(geocodingInput, preferredLanguage) {
    try {
      const response = await Axios.get(
        'https://maps.googleapis.com/maps/api/geocode/json',
        { params: { latlng: geocodingInput.latitude + ',' + geocodingInput.longitude, key: googleMapsReverseGeocodeApiKey, language: preferredLanguage } }
      );
      const compound_code = response.data.plus_code.global_code;
      const addresses = response.data.results;
      const formattedAddress = addresses[0].formatted_address;
      const establishmentAddress = (find(addresses, address => address.types.includes('establishment')))?.address_components || null;
      const streetAddress = (find(addresses, address => address.types.includes('street_address')))?.address_components || null;
      const premiseAddress = (find(addresses, address => address.types.includes('premise')))?.address_components || null;
      const localtyAddress = (find(addresses, address => address.types.includes('locality')))?.address_components || null;
      const administrativeAddress = (find(addresses, address => address.types.includes('administrative_area_level_1')))?.address_components || null;
      const countryAddress = (find(addresses, address => address.types.includes('country')))?.address_components || null;
      const countryCode = (find(countryAddress, element => element.types.includes('country')))?.short_name || null;
      const country = countryCode ? addLocalizationField(await this.getByCode(countryCode), 'name') : null;
      if (!country || country.status !== 'ACTIVE') return formatError([reverseAddressError.OUT_OF_SERVICE_COUNTRY]);
      let countryName = country.name.en;
      switch (preferredLanguage) {
        case 'ar':
          countryName = country.name.ar;
          break;
        case 'tr':
          countryName = country.name.tr;
          break;
        default:
          break;
      }
      //const description = '(' + geocodingInput.latitude + ',' + geocodingInput.longitude + ')';
      const addressList = [establishmentAddress, streetAddress, premiseAddress].filter(n => n);
      const areaLevel = (find(administrativeAddress, element => element.types.includes('administrative_area_level_1')))?.long_name || null;
      const locality = (find(localtyAddress, element => element.types.includes('locality')))?.long_name || null;
      if (addressList.length > 0) {
        const searchList = ['subpremise', 'premise', 'street_number', 'route', 'neighborhood', 'sublocality', 'locality', 'postal_code'];
        const addressObject = {};
        searchList.forEach(search => {
          addressList.forEach(address => {
            const value = (find(address, element => element.types.includes(search)))?.long_name || null;
            if (value && !addressObject[search]) {
              addressObject[search] = value;
            }
          });
        });
        /*
        const address = establishmentAddress || streetAddress || premiseAddress;
        const subpremise = (find(address, element => element.types.includes('subpremise')))?.long_name || null;
        const premise = (find(address, element => element.types.includes('premise')))?.long_name || null;
        const streetNumber = (find(address, element => element.types.includes('street_number')))?.long_name || null;
        const route = (find(address, element => element.types.includes('route')))?.long_name || null;
        const neighborhood = (find(address, element => element.types.includes('neighborhood')))?.long_name || null;
        const sublocality = (find(address, element => element.types.includes('sublocality')))?.long_name || null;
        const city = (find(address, element => element.types.includes('locality')))?.long_name || null;
        const postalCode = (find(address, element => element.types.includes('postal_code')))?.long_name || null;
        */
        const titleArrays = [addressObject.subpremise, addressObject.premise, addressObject.neighborhood, addressObject.route, addressObject.city].filter(n => n);
        //const elementArrays = [addressObject.subpremise, addressObject.premise, addressObject.streetNumber, addressObject.route, addressObject.neighborhood, addressObject.sublocality, addressObject.city, addressObject.postalCode].filter(n => n);
        //const title = titleArrays[0] || ((locality || areaLevel) ? (locality || areaLevel) + ' ' + countryName : countryName);
        const title = titleArrays[0] ? `${titleArrays[0]}` : `${compound_code}, ${countryName}`;
        //description = elementArrays.length > 0 ? elementArrays.join(',') : description;
        const reverseAddress = {
          title,
          description: formattedAddress,
          subpremise: addressObject.subpremise,
          premise: addressObject.premise,
          streetNumber: addressObject.street_number,
          route: addressObject.route,
          neighborhood: addressObject.neighborhood,
          sublocality: addressObject.sublocality,
          city: addressObject.locality,
          postalCode: addressObject.postal_code,
          countryCode,
          countryId: country.id,
        };
        return { address: reverseAddress };
      }
      return {
        address:
        {
          title: (locality || areaLevel) ? `${(locality || areaLevel)}` : `${compound_code}, ${countryName}`,
          description: formattedAddress,
          countryCode,
          countryId: country.id
        }
      };
    } catch (error) {
      return formatError([reverseAddressError.INVALID_GEOCODING]);
    }
    /*
    const options = {
      provider: 'google',
      apiKey: googleMapsReverseGeocodeApiKey,
      language: preferredLanguage.toLowerCase()
    };


    const geoCoder = nodeGeocoder(options);
    //console.log(await geoCoder.reverse({ lat: geocodingInput.latitude, lon: geocodingInput.longitude }));
    try {
      const {city, state, zipcode, streetName, streetNumber, countryCode, extra} = first(await geoCoder.reverse({ lat: geocodingInput.latitude, lon: geocodingInput.longitude }));
      const neighborhood = extra.neighborhood;
      //console.log(extra)
      //const establishment = extra.establishment
      const country = await this.getByCode(countryCode);
      if (!country || country.status !== 'ACTIVE') return formatError([reverseAddressError.OUT_OF_SERVICE_COUNTRY]);
      //console.log( line1, city, state, zipcode, streetName, streetNumber, countryCode, neighbourhood)
      //console.log(country)
      let elementArrays = [streetName, streetNumber, neighborhood, city, state, zipcode];
      elementArrays = elementArrays.filter(n => n);
      if (elementArrays.length === 0) return formatError([reverseAddressError.INVALID_ADDRESS]);
      const formattedAddress = elementArrays.join(',');
      const reverseAddress = {
        city,
        state,
        postalCode: zipcode,
        route: streetName,
        streetNumber,
        neighborhood,
        formattedAddress,
        countryCode,
        countryId: country.id
      };
      return {address: reverseAddress};
    } catch (error) {
      return formatError([reverseAddressError.INVALID_GEOCODING]);
    }
    */
  }
}

module.exports = Country;
