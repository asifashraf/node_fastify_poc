const { addLocalizationField } = require('../../lib/util');
module.exports = {
  Transaction: {
    customer({ customerId }, args, context) {
      return context.customer.getById(customerId);
    },
    async currency({ currencyId }, args, context) {
      if (!currencyId) {
        return null;
      }
      return addLocalizationField(
        addLocalizationField(
          await context.currency.getById(currencyId),
          'symbol'
        ),
        'subunitName'
      );
    },
  },
};
