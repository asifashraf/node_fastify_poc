// const { uuid } = require('./../../src/lib/util');
// exports.up = knex => {
//   return knex
//     .select('order_sets.*')
//     .from('order_sets')
//     .join(
//       'payment_statuses',
//       'order_sets.id',
//       'payment_statuses.reference_order_id'
//     )
//     .joinRaw(
//       `
//       LEFT JOIN transactions ON order_sets.id = transactions.reference_order_id
//       `
//     )
//     .where('payment_statuses.name', 'PAYMENT_SUCCESS')
//     .whereRaw(
//       `
//       order_sets.total not in
//         (select amount from transactions where order_sets.id = reference_order_id and order_sets.total = amount)
//     `
//     )
//     .then(orderSets => {
//       const transactions = [];
//       let node;
//       orderSets.forEach(orderSet => {
//         node = {
//           id: uuid.get(),
//           reference_order_id: orderSet.id,
//           order_type: 'ORDER_SET',
//           customer_id: orderSet.customer_id,
//           action: 'ORDER',
//           type: 'DEBITED',
//           amount: orderSet.total,
//           created: orderSet.created_at,
//           updated: orderSet.created_at,
//         };
//         transactions.push(node);
//       });
//       return knex('transactions').insert(transactions);
//     });
// };

exports.up = () => Promise.resolve();
exports.down = () => {};
