/* eslint-disable camelcase */
const knex = require('../../database');

console.log('Running: referral already availed column');
/*
 if the users has placed three orders
 if the user is a referral user
 if the users has availed referral bonus already
*/
// const customerIds = [];
// knex
//   .select('id')
//   .from('customers')
//   .innerJoin('referrals', 'referrals.receiver_id', 'customers.id')
//   .where('customers.referral_reward_availed', false)
//   .where('referrals.status', 'ORDERED')
//   .then(function(result) {
//     result.forEach(function(id) {
//       console.log(id);
//
//       knex
//         .select('total_orders')
//         .from('customer_stats')
//         .where('customer_id', id)
//         .then(function(totalOrders) {
//           console.log('totalOrders' + totalOrders);
//           if (totalOrders > 3) {
//             // knex('customers').update('referral_reward_availed', true)
//             customerIds.push(id);
//             console.log('orders are greater');
//           } else {
//             console.log('orders are less');
//           }
//         });
//     });
//   });

knex.transaction(async trx => {
  await trx.raw(`update customers
set referral_reward_availed = true
from referrals
    where customers.id = referrals.receiver_id
    and referrals.status = 'ORDERED'`);
  console.log('done!');
});
