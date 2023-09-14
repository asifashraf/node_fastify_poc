const DataLoader = require('dataloader');
const { map, orderBy } = require('lodash');
const {
  transformToCamelCase,
  addLocalizationField,
} = require('../../lib/util');

function createLoaders(model) {
  return {
    byCountryCode: new DataLoader(async countryCodes => {
      const customerAddressesFields = await model
        .roDb('customer_addresses_fields')
        .join(
          'countries',
          'customer_addresses_fields.country_id',
          'countries.id'
        )
        .select(
          model.roDb.raw('customer_addresses_fields.*, countries.iso_code')
        )
        .whereIn('iso_code', countryCodes)
        .orderBy('order', 'asc')
        .then(transformToCamelCase);
      return map(countryCodes, async countryCode => {
        const result = customerAddressesFields.filter(
          item => item.isoCode === countryCode
        );
        return addLocalizationField(
          orderBy(result, ['order'], ['asc']),
          'title'
        );
      });
    }),
  };
}

module.exports = { createLoaders };
