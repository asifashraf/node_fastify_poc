const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');

class OrderItemOption extends BaseModel {
  constructor(db, context) {
    super(db, 'order_item_options', context);
    this.loaders = createLoaders(this);
  }

  getAllForOrderItemId(orderItemId) {
    return this.roDb(this.tableName).where('order_item_id', orderItemId);
  }

  async getCurrency(orderItemOptionId) {
    const [currency] = await this.db
      .select('currencies.*')
      .from('order_item_options')
      .join(
        'order_items',
        'order_item_options.order_item_id',
        'order_items.id '
      )
      .join('order_sets', 'order_items.order_set_id', 'order_sets.id')
      .join('currencies', 'order_sets.currency_id', 'currencies.id')
      .where('order_item_options.id', orderItemOptionId);

    return currency;
  }
}

module.exports = OrderItemOption;
