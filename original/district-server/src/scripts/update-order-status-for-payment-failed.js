/* eslint-disable camelcase */

const knex = require('../../database');
const { map } = require('lodash');
const { uuid, transformToCamelCase } = require('../lib/util');

console.log('Running: update-order-status-for-payment-failed.js');

knex
  .transaction(async trx => {
    const query = `
      SELECT os.id from order_sets as os
      INNER JOIN payment_statuses as ps ON ps.id = (
        SELECT id FROM payment_statuses
        WHERE payment_statuses.reference_order_id = os.id
        ORDER BY payment_statuses.created_at DESC LIMIT 1
      )
      where os.current_status = 'INITIATED' and ps.name = 'PAYMENT_FAILURE' order BY os.created_at;
    `;

    const data = map(
      await new Promise((resolve, reject) => {
        trx
          .raw(query)
          .then(({ rows }) => resolve(rows))
          .catch(err => reject(err));
      }).then(transformToCamelCase),
      n => n
    );
    console.log('Checking data');
    if (data && Array.isArray(data) && data.length > 0) {
      console.log('Records', data.length);
      const newEntries = map(data, d => {
        const id = uuid.get();
        return trx('order_set_statuses').insert({
          id,
          order_set_id: d.id,
          status: 'PAYMENT_FAILURE'
        })
      });
      await Promise.all(newEntries);
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
