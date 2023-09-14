const { addLocalizationField } = require('../../lib/util');

module.exports = {
  OrderItemOption: {
    async currency({ id }, args, context) {
      return addLocalizationField(
        addLocalizationField(
          await context.orderItemOption.getCurrency(id),
          'symbol'
        ),
        'subunitName'
      );
    },
  },
};
