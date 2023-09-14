const { addLocalizationField } = require('../../lib/util');

module.exports = {
  Currency: {
    async country({ id }, args, context) {
      return addLocalizationField(
        await context.currency.getCountry(id),
        'name'
      );
    },
    code({ symbol }) {
      return symbol;
    },
  },
};
