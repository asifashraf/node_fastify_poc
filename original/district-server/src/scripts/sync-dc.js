/* eslint-disable camelcase */

// Rewards: script from back end for existing users to be on the same tiers after the revamp (updating tiers points) for Toby's

const knex = require('../../database');
const { map } = require('lodash');
const { transformToCamelCase } = require('../lib/util');

knex
  .transaction(async trx => {
    const query = `
    select coalesce((sum(credit) - sum(debit)),0) as dc, customer_id, currency_id from loyalty_transactions 
where order_type in ('DISCOVERY_CREDITS', 'DISCOVERY_CREDITS_REFUND', 'DISCOVERY_CREDITS_EXPIRY') GROUP by customer_id, currency_id;
`;

    const data = map(
      await new Promise((resolve, reject) => {
        trx
          .raw(query)
          .then(({ rows }) => resolve(rows))

          .catch(err => reject(err));
      }).then(transformToCamelCase),
      n => {
        return n;
      }
    );
    console.log('Checking data');

    if (data && Array.isArray(data) && data.length > 0) {
      let update = [];
      console.log('Records', data.length);

      update = map(data, d => {
        return trx('wallet_accounts')
          .update('discovery_amount', d.dc ? Number(d.dc) : 0)
          .where({ customer_id: d.customerId, currency_id: d.currencyId });
      });
      if (update && update.length > 0) {
        await Promise.all(update);
      }
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
