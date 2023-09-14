const { addLocalizationField } = require('../../lib/util');
module.exports = {
  OrderItem: {
    orderSet({ orderSetId }, args, context) {
      return context.orderSet.getById(orderSetId);
    },
    async selectedOptions({ id, selectedOptions }, args, context) {
      if (selectedOptions) {
        return addLocalizationField(selectedOptions, 'value');
      }
      return context.orderItemOption.loaders.byOrderItem.load(id);
    },
    async menuItem({ menuItemId }, args, context) {
      return addLocalizationField(
        addLocalizationField(
          await context.menuItem.getById(menuItemId),
          'name'
        ),
        'itemDescription'
      );
    },
  },
};
