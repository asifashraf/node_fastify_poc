/* eslint-disable camelcase */
const moment = require('moment');
const {
  giftCardTransactionOrderType,
} = require('./../../../src/schema/root/enums');
module.exports = (giftCards, customers) => {
  return {
    gift_card_transaction1: {
      id: 'cc451fc7-7854-4bdd-bcab-c32b20568921',
      gift_card_id: giftCards.gift_card2.id,
      order_type: giftCardTransactionOrderType.ORDER_SET,
      reference_order_id: 'manual_1',
      credit: 2000,
      debit: 0,
      created: moment('2018-01-05T12:00:00+01:00').toISOString(),
      updated: moment('2018-01-05T12:00:00+01:00').toISOString(),
      currency_id: 'f216d955-0df1-475d-a9ec-08cb6c0f92bb',
      customer_id: customers[0].id,
    },
    gift_card_transaction2: {
      id: 'cc451fc7-7854-4bdd-bcab-c32b20568922',
      gift_card_id: giftCards.gift_card2.id,
      order_type: giftCardTransactionOrderType.GIFT_CARD_ORDER,
      reference_order_id: 'manual_2',
      credit: 0,
      debit: 1000,
      created: moment('2018-01-05T12:00:00+01:00').toISOString(),
      updated: moment('2018-01-05T12:00:00+01:00').toISOString(),
      currency_id: 'f216d955-0df1-475d-a9ec-08cb6c0f92bb',
      customer_id: customers[0].id,
    },
    gift_card_transaction3: {
      id: 'cc451fc7-7854-4bdd-bcab-c32b20568923',
      gift_card_id: giftCards.gift_card2.id,
      order_type: giftCardTransactionOrderType.GIFT_CARD_ORDER,
      reference_order_id: 'manual_3',
      credit: 0,
      debit: 1000,
      created: moment('2018-01-05T12:00:00+01:00').toISOString(),
      updated: moment('2018-01-05T12:00:00+01:00').toISOString(),
      currency_id: 'f216d955-0df1-475d-a9ec-08cb6c0f92bb',
      customer_id: customers[0].id,
    },
  };
};
