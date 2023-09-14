/* eslint-disable camelcase */
const { uuid } = require('../lib/util');
const knex = require('../../database');

knex
  .transaction(async trx => {
    const currencyId = 'f216d955-0df1-475d-a9ec-08cb6c0f92bb';
    const { rows } = await trx.raw(`
    SELECT *, RIGHT(balance::VARCHAR, 1), ((10 - RIGHT(balance::VARCHAR, 1)::NUMERIC(13,3)) / 1000)::NUMERIC(13,3)  AS to_be_added
    FROM (
      SELECT customer_id, coalesce((sum(credit) - sum(debit)),0) as balance
      FROM loyalty_transactions
      WHERE  currency_id = '${currencyId}'
      GROUP BY customer_id, currency_id
      HAVING coalesce((sum(credit) - sum(debit)),0) > 0
    ) AS sub
    WHERE RIGHT(balance::VARCHAR, 1)::INT > 0
    `);
    const transactions = [];
    rows.map(row => {
      transactions.push(
        trx('loyalty_transactions').insert({
          id: uuid.get(),
          order_type: 'NORMALIZATION',
          reference_order_id: `NORMALIZATION_${uuid.get()}`,
          credit: row.to_be_added,
          debit: 0,
          customer_id: row.customer_id,
          currency_id: currencyId,
        })
      );
      return row;
    });

    return Promise.all(transactions);
  })
  .then(() => {
    console.log('all done!');
    return knex.destroy();
  })
  .catch(err => {
    console.log('error', err);
    return knex.destroy();
  });
