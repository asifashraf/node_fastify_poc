const DataLoader = require('dataloader');
const { map, first } = require('lodash');

const { addLocalizationField } = require('../../lib/util');

function createLoaders(model) {
  return {
    currency: new DataLoader(async shippingPolicyIds => {
      const currencies = addLocalizationField(
        await model
          .db('currencies')
          .join('countries', 'countries.currency_id', 'currencies.id')
          .join(
            'shipping_policies',
            'shipping_policies.country_id',
            'countries.id'
          )
          .select('currencies.*', 'shipping_policies.id as shipping_policy_id')
          .whereIn('shipping_policies.id', shippingPolicyIds),
        'code'
      );
      return map(shippingPolicyIds, shippingPolicyId =>
        first(
          currencies.filter(
            currency => currency.shippingPolicyId === shippingPolicyId
          )
        )
      );
    }),
  };
}

module.exports = { createLoaders };
