/*
 * This script is prepared for this incident. If you have no idea don't execute!
 * https://cofeapp.atlassian.net/wiki/spaces/EP/pages/505053523/Delivery+Fee+2021-08-09+2021-09-01+Incident
 * */

/* eslint-disable camelcase */
const knex = require('../../database');
const { map } = require('lodash');
const { uuid, transformToCamelCase } = require('../lib/util');
const fs = require('fs');

knex
  .transaction(async trx => {
    const query = `select os.id,
                          os.customer_id,
                          os.currency_id,
                          b.delivery_fee
                   from public.order_sets os
                          join public.order_fulfillment of2 on
                     of2.order_set_id = os.id
                          join public.brand_locations bl on
                     os.brand_location_id = bl.id
                          join public.brands b on
                     bl.brand_id = b.id
                          join public.customer_used_perks cup on
                     os.id = cup.order_set_id
                          join public.currencies c on
                     os.currency_id = c.id
                          join public.customers c2 on
                     os.customer_id = c2.id
                   where os.fee = 0
                     and os.current_status = 'COMPLETED'
                     and os.paid = true
                     and os.refunded = false
                     and os.total = (os.subtotal + fee - os.coupon_amount - os.reward_amount + b.delivery_fee)
                     and b.delivery_fee > 0
                     and of2."type" in ('DELIVERY', 'EXPRESS_DELIVERY')
                     and cup."type" = 'FREE_DELIVERY'
                     and cup.total > 0
                     and os.is_cashback_coupon = false`;

    const data = map(
      await new Promise((resolve, reject) => {
        trx
          .raw(query)
          .then(({ rows }) => resolve(rows))
          .catch(err => reject(err));
      }).then(transformToCamelCase),
      n => {
        n.orderId = n.id;
        n.deliveryFee = Number(n.deliveryFee);
        return n;
      }
    );
    console.log('Checking data');
    if (data && Array.isArray(data) && data.length > 0) {
      console.log('Records', data.length);
      const file = fs.createWriteStream('./refund-delivery-fee-queries.txt');
      for (const d of data) {
        // eslint-disable-next-line no-await-in-loop
        const existLoyality = await trx('loyalty_transactions')
          .where({
            order_type: 'DELIVERY_FEE_REFUND',
            reference_order_id: d.orderId,
            customer_id: d.customerId,
            currency_id: d.currencyId,
          })
          .first();

        if (existLoyality) continue;

        const id = uuid.get();
        const newLoyalty = {
          id,
          reference_order_id: d.orderId,
          order_type: 'DELIVERY_FEE_REFUND',
          credit: Number(d.deliveryFee),
          customer_id: d.customerId,
          currency_id: d.currencyId,
        };
        // eslint-disable-next-line no-await-in-loop
        await trx('loyalty_transactions').insert(newLoyalty);
        file.write(
          JSON.stringify({
            process: 'insert_loyalty_transactions',
            data: newLoyalty,
          }) + '\n'
        );

        /** ************************************************************** */

        // eslint-disable-next-line no-await-in-loop
        const customerCurrentCurrencyWallet = await trx('wallet_accounts')
          .where({ customer_id: d.customerId, currency_id: d.currencyId })
          .first();

        if (customerCurrentCurrencyWallet) {
          const newTotal =
            Number(customerCurrentCurrencyWallet.total) + Number(d.deliveryFee);

          const newRegularAmount =
            Number(customerCurrentCurrencyWallet.regular_amount) +
            Number(d.deliveryFee);

          // eslint-disable-next-line no-await-in-loop
          await trx('wallet_accounts')
            .where({ id: customerCurrentCurrencyWallet.id })
            .update({
              total: newTotal,
              regular_amount: newRegularAmount,
            });

          file.write(
            JSON.stringify({
              process: 'update_wallet_accounts',
              data: {
                id: customerCurrentCurrencyWallet.id,
                oldTotal: customerCurrentCurrencyWallet.total,
                newTotal,
                oldRegularAmount: customerCurrentCurrencyWallet.regular_amount,
                newRegularAmount,
              },
            }) + '\n'
          );
        }

        /** ************************************************************** */

        // eslint-disable-next-line no-await-in-loop
        const currentOrder = await trx('order_sets')
          .where({ id: d.orderId })
          .first();

        if (currentOrder) {
          const newTotal = Number(currentOrder.total) - Number(d.deliveryFee);

          // eslint-disable-next-line no-await-in-loop
          await trx('order_sets')
            .where({ id: currentOrder.id })
            .update({ total: newTotal });

          file.write(
            JSON.stringify({
              process: 'update_order_set',
              data: {
                id: currentOrder.id,
                oldTotal: currentOrder.total,
                newTotal,
              },
            }) + '\n'
          );
        }
      }
      file.end();
    } else {
      console.log('Data not found');
    }
  })
  .then(() => {
    console.log('All done!');
    return knex.destroy();
  })
  .catch(err => {
    console.log('error', err);
    return knex.destroy();
  });
