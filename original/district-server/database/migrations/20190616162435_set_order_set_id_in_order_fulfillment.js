// exports.up = knex => {
//   return knex
//     .select()
//     .from('order_fulfillment')
//     .whereNull('order_set_id')
//     .then(async orderFulfillments => {
//       orderFulfillments.forEach(async orderFulfillment => {
//         orderFulfillment.order_set_id = null;
//         if (orderFulfillment) {
//           const orderSet = await knex()
//             .select('order_set_id')
//             .from('orders')
//             .where({ id: orderFulfillment.order_id })
//             .first();
//
//           if (orderSet) {
//             if (orderSet.order_set_id) {
//               orderFulfillment.order_set_id = orderSet.order_set_id;
//             }
//           }
//         }
//       });
//
//       return knex.transaction(trx => {
//         return knex
//           .select(1)
//           .then(() => {
//             return Promise.all(
//               orderFulfillments.map(row => {
//                 return knex('order_fulfillment')
//                   .update({
//                     order_set_id: row.order_set_id,
//                   })
//                   .where('order_id', '=', row.order_id)
//                   .transacting(trx);
//               })
//             );
//           })
//           .then(trx.commit)
//           .catch(trx.rollback);
//       });
//     });
// };
// exports.down = knex => {
//   return knex
//     .select()
//     .from('order_fulfillment')
//     .whereNotNull('order_set_id')
//     .then(async orderFulfillments => {
//       orderFulfillments.forEach(async orderFulfillment => {
//         orderFulfillment.order_set_id = null;
//       });
//
//       return knex.transaction(trx => {
//         return knex
//           .select(1)
//           .then(() => {
//             return Promise.all(
//               orderFulfillments.map(row => {
//                 return knex('order_fulfillment')
//                   .update({
//                     order_set_id: null,
//                   })
//                   .where('order_id', '=', row.order_id)
//                   .transacting(trx);
//               })
//             );
//           })
//           .then(trx.commit)
//           .catch(trx.rollback);
//       });
//     });
// };

exports.up = () => Promise.resolve();
exports.down = () => {};
