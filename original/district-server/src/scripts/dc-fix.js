/* eslint-disable camelcase */

// Rewards: script from back end for existing users to be on the same tiers after the revamp (updating tiers points) for Toby's

const knex = require('../../database');
const { map, groupBy } = require('lodash');
const { transformToCamelCase } = require('../lib/util');

knex
  .transaction(async trx => {
    const query = `
    select dc.*,dcr.id as used from discovery_credits dc left JOIN discovery_credit_redemptions dcr on dcr.discovery_credit_id = dc.id
    where dcr.id is NULL
    order by dc.customer_id;
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

      const groupByCustomers = groupBy(data, 'customerId');
      //   console.log('groupByCustomers', groupByCustomers);

      // eslint-disable-next-line guard-for-in
      for (const prop in groupByCustomers) {
        const credits = groupByCustomers[prop];

        if (Array.isArray(credits) && credits.length > 0) {
          const groupByCurrencyId = groupBy(credits, 'currencyId');

          // eslint-disable-next-line guard-for-in
          for (const prop in groupByCurrencyId) {
            const c = groupByCurrencyId[prop];
            // eslint-disable-next-line max-depth
            if (Array.isArray(c) && c.length > 1) {
              // eslint-disable-next-line max-depth
              for (let i = 1; i < c.length; i++) {
                deleteIds.push(c[i].id);
              }
            }
          }
        }
      }
      console.log('deleteIds', deleteIds.length);
      if (deleteIds.length > 0) {
        await knex('discovery_credits')
          .whereIn('id', deleteIds)
          .del();
      }

      //   await Promise.all(newEntries);
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
