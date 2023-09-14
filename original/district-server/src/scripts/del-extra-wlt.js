/* eslint-disable camelcase */

// Rewards: script from back end for existing users to be on the same tiers after the revamp (updating tiers points) for Toby's

const knex = require('../../database');
const { map } = require('lodash');
const { transformToCamelCase } = require('../lib/util');

knex
  .transaction(async trx => {
    const query = `
    SELECT * from wallet_accounts wc where wc.discovery_amount > 0 and wc.discovery_amount_expires_on = 0 and wc.id not in (SELECT wallet_account_id from wallet_account_referrals) and wc.id not in (SELECT wallet_account_id from wallet_account_cashbacks);
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
    const deleteIds = [];
    if (data && Array.isArray(data) && data.length > 0) {
      console.log('Records', data.length);
      for (let i = 0; i < data.length; i++) {
        deleteIds.push(data[i].id);
      }

      console.log('deleteIds', deleteIds.length);
      if (deleteIds.length > 0) {
        await knex('wallet_accounts')
          .whereIn('id', deleteIds)
          .del();
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
