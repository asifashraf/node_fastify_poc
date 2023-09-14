/* eslint-disable camelcase */

// Rewards: script from back end for existing users to be on the same tiers after the revamp (updating tiers points) for Toby's

const knex = require('../../database');
const { map } = require('lodash');
const { uuid, transformToCamelCase } = require('../lib/util');

knex
  .transaction(async trx => {
    const query = `
    select * from wallet_accounts wa where cashback_amount > 0 or cashback_amount_expires_on > 0; 
`;

    const data = map(
      await new Promise((resolve, reject) => {
        trx
          .raw(query)
          .then(({ rows }) => resolve(rows))

          .catch(err => reject(err));
      }).then(transformToCamelCase),
      n => {
        return {
          id: uuid.get(),
          wallet_account_id: n.id,
          amount: n.cashbackAmount,
          expires_on: n.cashbackAmountExpiresOn,
          deprecated: false,
        };
      }
    );
    console.log('Checking data');
    if (data && Array.isArray(data) && data.length > 0) {
      console.log('Records', data);
      const newEntries = map(data, d => {
        return trx('wallet_account_cashbacks').insert(d);
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
