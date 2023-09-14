const DataLoader = require('dataloader');
const { map, groupBy } = require('lodash');
const { addLocalizationField } = require('../../lib/util');

function createLoaders(model) {
  return {
    country: new DataLoader(async giftCardOrdersIds => {
      const countries = groupBy(
        addLocalizationField(
          await model.db
            .table('countries')
            .select(
              model.db.raw(
                'countries.*, gift_card_orders.id as gift_card_orders_id'
              )
            )
            .join(
              'gift_card_orders',
              'gift_card_orders.country_id',
              'countries.id'
            )
            .whereIn('gift_card_orders.id', giftCardOrdersIds),
          'name'
        ),
        'giftCardOrdersId'
      );
      return map(giftCardOrdersIds, giftCardOrderId =>
        (countries[giftCardOrderId] ? countries[giftCardOrderId][0] : null)
      );
    }),
    currency: new DataLoader(async giftCardOrdersIds => {
      const currencies = groupBy(
        addLocalizationField(
          await model.db
            .table('currencies')
            .select(
              model.db.raw(
                'currencies.*, gift_card_orders.id as gift_card_orders_id'
              )
            )
            .join(
              'gift_card_orders',
              'gift_card_orders.currency_id',
              'currencies.id'
            )
            .whereIn('gift_card_orders.id', giftCardOrdersIds),
          'symbol'
        ),
        'giftCardOrdersId'
      );
      return map(giftCardOrdersIds, giftCardOrderId =>
        (currencies[giftCardOrderId] ? currencies[giftCardOrderId][0] : null)
      );
    }),
    giftCardTemplate: new DataLoader(async orderIds => {
      const giftCardTemplats = groupBy(
        addLocalizationField(
          addLocalizationField(
            await model.db
              .table('gift_card_templates')
              .select(
                model.db.raw(
                  'gift_card_templates.*, gift_card_orders.id as gift_card_orders_id'
                )
              )
              .join(
                'gift_card_orders',
                'gift_card_orders.gift_card_template_id',
                'gift_card_templates.id'
              )
              .whereIn('gift_card_orders.id', orderIds),
            'name'
          ),
          'imageUrl'
        ),
        'giftCardOrdersId'
      );

      return map(orderIds, orderId =>
        (giftCardTemplats[orderId] ? giftCardTemplats[orderId][0] : null)
      );
    }),
    customer: new DataLoader(async giftCardOrdersIds => {
      const customers = groupBy(
        await model.db
          .table('customers')
          .select(
            model.db.raw(
              'customers.*, gift_card_orders.id as gift_card_orders_id'
            )
          )
          .join(
            'gift_card_orders',
            'gift_card_orders.customer_id',
            'customers.id'
          )
          .whereIn('gift_card_orders.id', giftCardOrdersIds),
        'giftCardOrdersId'
      );
      return map(giftCardOrdersIds, giftCardOrderId =>
        (customers[giftCardOrderId] ? customers[giftCardOrderId][0] : null)
      );
    }),
  };
}

module.exports = { createLoaders };
