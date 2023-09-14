function createLoaders() {}

module.exports = { createLoaders };

/* const DataLoader = require('dataloader');
const { map, groupBy} = require('lodash');
const { addLocalizationField } = require('../../lib/util');
function createLoaders(model) {
  return {
    countries: new DataLoader(async paymentMethodIds => {
      const countries = addLocalizationField(await model.db.table('countries as c')
        .select(
          model.db.raw(
            'c.id as country_id, c.name, c.name_ar, c.name_tr, pmc.payment_method_id'
          )
        )
        .leftJoin(
          'payment_methods_countries as pmc',
          'pmc.country_id',
          'c.id'
        )
        .whereIn('pmc.payment_method_id', paymentMethodIds),
      'name');
      const grouped = groupBy(countries, 'paymentMethodId');
      return map(paymentMethodIds, paymentMethodId =>
        (grouped[paymentMethodId]
          ? grouped[paymentMethodId].sort((a, b) =>
            (a.name > b.name ? -1 : a.name < b.name ? 1 : 0)
          )
          : [])
      );
    }),
  };
}
module.exports = { createLoaders }; */
