const DataLoader = require('dataloader');
const { map, groupBy } = require('lodash');
const { addLocalizationField } = require('../../lib/util');

function createLoaders(model) {
  return {
    giftCardOrder: new DataLoader(async giftCardsIds => {
      const giftCardOrders = groupBy(
        await model.db
          .table('gift_card_orders')
          .select(
            model.db.raw('gift_card_orders.*, gift_cards.id as gift_cards_id')
          )
          .join(
            'gift_cards',
            'gift_cards.gift_card_order_id',
            'gift_card_orders.id'
          )
          .whereIn('gift_cards.id', giftCardsIds),
        'giftCardsId'
      );
      return map(giftCardsIds, giftCardId =>
        (giftCardOrders[giftCardId] ? giftCardOrders[giftCardId][0] : null)
      );
    }),
    giftCardTemplate: new DataLoader(async giftCardsIds => {
      const giftCardTemplates = groupBy(
        addLocalizationField(
          addLocalizationField(
            await model.db
              .table('gift_card_templates')
              .select(
                model.db.raw(
                  'gift_card_templates.*, gift_cards.id as gift_cards_id'
                )
              )
              .join(
                'gift_cards',
                'gift_cards.gift_card_template_id',
                'gift_card_templates.id'
              )
              .whereIn('gift_cards.id', giftCardsIds),
            'name'
          ),
          'imageUrl'
        ),

        'giftCardsId'
      );
      return map(giftCardsIds, giftCardId =>
        (giftCardTemplates[giftCardId] ? giftCardTemplates[giftCardId][0] : null)
      );
    }),
    sender: new DataLoader(async giftCardsIds => {
      const customers = groupBy(
        await model.db
          .table('customers')
          .select(model.db.raw('customers.*, gift_cards.id as gift_cards_id'))
          .join('gift_cards', 'gift_cards.sender_id', 'customers.id')
          .whereIn('gift_cards.id', giftCardsIds),
        'giftCardsId'
      );
      return map(giftCardsIds, giftCardId =>
        (customers[giftCardId] ? customers[giftCardId][0] : null)
      );
    }),
    receiver: new DataLoader(async giftCardsIds => {
      const customers = groupBy(
        await model.db
          .table('customers')
          .select(model.db.raw('customers.*, gift_cards.id as gift_cards_id'))
          .join('gift_cards', 'gift_cards.receiver_id', 'customers.id')
          .whereIn('gift_cards.id', giftCardsIds),
        'giftCardsId'
      );
      return map(giftCardsIds, giftCardId =>
        (customers[giftCardId] && customers[giftCardId].length > 0
          ? customers[giftCardId][0]
          : null)
      );
    }),
    country: new DataLoader(async giftCardsIds => {
      const countries = groupBy(
        addLocalizationField(
          await model
            .db('countries')
            .join(
              'gift_card_templates',
              'gift_card_templates.country_id',
              'countries.id'
            )
            .join(
              'gift_cards',
              'gift_cards.gift_card_template_id',
              'gift_card_templates.id'
            )
            .select('countries.*', 'gift_cards.id as gift_cards_id')
            .whereIn('gift_cards.id', giftCardsIds),
          'name'
        ),
        'giftCardsId'
      );
      return map(giftCardsIds, giftCardId =>
        (countries[giftCardId] ? countries[giftCardId][0] : null)
      );
    }),
    currency: new DataLoader(async giftCardsIds => {
      const currencys = groupBy(
        addLocalizationField(
          await model
            .db('currencies')
            .join(
              'gift_card_templates',
              'gift_card_templates.currency_id',
              'currencies.id'
            )
            .join(
              'gift_cards',
              'gift_cards.gift_card_template_id',
              'gift_card_templates.id'
            )
            .select('currencies.*', 'gift_cards.id as gift_cards_id')
            .whereIn('gift_cards.id', giftCardsIds),
          'symbol'
        ),
        'giftCardsId'
      );
      return map(giftCardsIds, giftCardId =>
        (currencys[giftCardId] ? currencys[giftCardId][0] : null)
      );
    }),
    transactions: new DataLoader(async giftCardsIds => {
      const giftCardTransactions = groupBy(
        addLocalizationField(
          addLocalizationField(
            await model
              .db('gift_card_transactions')
              .whereIn('gift_card_id', giftCardsIds)
              .orderBy('created', 'ASC'),
            'name'
          ),
          'imageUrl'
        ),
        'giftCardId'
      );
      return map(giftCardsIds, giftCardsId =>
        (giftCardTransactions[giftCardsId]
          ? giftCardTransactions[giftCardsId]
          : [])
      );
    }),
  };
}

module.exports = { createLoaders };
