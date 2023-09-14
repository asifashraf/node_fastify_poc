/* eslint-disable camelcase */
const { map, includes } = require('lodash');
const Promise = require('bluebird');

const knex = require('../../database');
const { uuid, generateShortCode } = require('../lib/util');

const generateCards = async (input, trx) => {
  const template = await trx('gift_card_templates')
    .where('id', input.gift_card_template_id)
    .first();
  const shortCodes = [];
  while (shortCodes.length < input.noOfCards) {
    const sc = generateShortCode(6);
    if (!includes(shortCodes, sc)) {
      shortCodes.push(sc);
    }
  }

  await Promise.each(
    map(shortCodes, async shortCode => {
      const giftCardOrderId = uuid.get();
      await trx('gift_card_orders').insert({
        id: giftCardOrderId,
        short_code: shortCode,
        amount: input.amount,
        currency_id: template.currency_id,
        country_id: template.country_id,
        payment_method: 'N/A',
        gift_card_template_id: template.id,
        customer_id: input.customer_id,
        delivery_method: 'SHARE_MESSAGE',
        receiver_email: null,
        receiver_phone_number: null,
        anonymous_sender: true,
      });

      const giftCardId = uuid.get();
      // console.log('giftCardId', giftCardId);
      await trx('gift_cards').insert({
        id: giftCardId,
        gift_card_order_id: giftCardOrderId,
        image_url: template.image_url,
        image_url_ar: template.image_url_ar,
        code: shortCode,
        initial_amount: input.amount,
        amount: input.amount,
        country_id: template.country_id,
        currency_id: template.currency_id,
        gift_card_template_id: template.id,
        sender_id: input.customer_id,
        name: template.name,
        name_ar: template.name_ar,
        name_tr: template.name_tr,
        anonymous_sender: true,
        receiver_id: null,
        redeemed_on: null,
        status: 'ACTIVE',
        // brand_id: null,
      });

      // console.log('id', uuid.get());
      // console.log('reference_order_id', uuid.get());
      await trx('gift_card_transactions').insert({
        id: uuid.get(),
        gift_card_id: giftCardId,
        order_type: 'SCRIPT_GENERATION',
        credit: input.amount,
        debit: 0,
        currency_id: template.currency_id,
        customer_id: input.customer_id,
        reference_order_id: uuid.get(),
      });
    }),
    op => op
  );
  console.log(shortCodes.join(','));
};

knex
  .transaction(async trx => {
    const input = {
      noOfCards: 2,
      amount: 10,
      customer_id: '26d1f34e-ec9f-46a5-a26b-81dc34426f1e', // manual cofe customer
      gift_card_template_id: '86bd3e02-77f3-4374-b019-702574b7db39',
    };
    await generateCards(input, trx);
  })
  .then(() => {
    console.log('all done!');
    return knex.destroy();
  })
  .catch(err => {
    console.log('error', err);
    return knex.destroy();
  });
