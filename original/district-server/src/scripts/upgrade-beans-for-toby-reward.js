/* eslint-disable camelcase */

// Rewards: script from back end for existing users to be on the same tiers after the revamp (updating tiers points) for Toby's

const knex = require('../../database');
const { map } = require('lodash');
const { uuid, transformToCamelCase } = require('../lib/util');

knex
  .transaction(async trx => {
    const query = `
    SELECT tbl.reward_id, 
       tbl.customer_id, 
       rto.title, 
       tbl.current_beans, 
       ro.conversion_rate, 
       CASE 
         WHEN rto.title = 'Silver' THEN 350 
         WHEN rto.title = 'Gold' THEN 750 
         WHEN rto.title = 'Platinum' THEN 2000 
         WHEN rto.title = 'Diamond' THEN 4500 
         ELSE 0 
       end                         new_bean_limit, 
       ( CASE 
           WHEN rto.title = 'Silver' THEN 350 
           WHEN rto.title = 'Gold' THEN 750 
           WHEN rto.title = 'Platinum' THEN 2000 
           WHEN rto.title = 'Diamond' THEN 4500 
           ELSE 0 
         end - tbl.current_beans ) need_to_add 
FROM   (SELECT Sum(rpt.points) AS current_beans, 
               rpt.reward_id, 
               rpt.customer_id, 
               (SELECT reward_tier_id 
                FROM   customer_tiers cti 
                WHERE  cti.customer_id = rpt.customer_id 
                       AND cti.reward_id = rpt.reward_id 
                ORDER  BY created DESC 
                LIMIT  1)      AS reward_tier_id 
        FROM   reward_points_transactions rpt 
        WHERE  rpt.reward_id = 'ae1ad0e9-fdec-45dd-b0e2-d3eaa724600a' 
        GROUP  BY rpt.reward_id, 
                  customer_id) AS tbl 
       INNER JOIN reward_tiers rto 
               ON rto.id = tbl.reward_tier_id 
       INNER JOIN rewards ro 
               ON rto.reward_id = ro.id 
WHERE  (( CASE 
            WHEN rto.title = 'Silver' THEN 350 
            WHEN rto.title = 'Gold' THEN 750 
            WHEN rto.title = 'Platinum' THEN 2000 
            WHEN rto.title = 'Diamond' THEN 4500 
            ELSE 0 
          end - tbl.current_beans )) > 0 
ORDER  BY tbl.current_beans ASC 
`;

    const data = map(
      await new Promise((resolve, reject) => {
        trx
          .raw(query)
          .then(({ rows }) => resolve(rows))

          .catch(err => reject(err));
      }).then(transformToCamelCase),
      n => {
        n.currentBeans = Number(n.currentBeans);
        n.newBeanLimit = Number(n.newBeanLimit);
        n.needToAdd = Number(n.needToAdd);
        n.conversionRate = Number(n.conversionRate);
        return n;
      }
    );
    console.log('Checking data');
    if (data && Array.isArray(data) && data.length > 0) {
      console.log('Records', data.length);
      const newEntries = map(data, d => {
        const id = uuid.get();

        return trx('reward_points_transactions').insert({
          id,
          customer_id: d.customerId,
          reward_id: d.rewardId,
          source: 'CUSTOM',
          conversion_rate: d.conversionRate,
          points: d.needToAdd,
          source_id: id,
        });
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
