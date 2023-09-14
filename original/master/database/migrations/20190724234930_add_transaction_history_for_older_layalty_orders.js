// const { uuid } = require('./../../src/lib/util');
// exports.up = knex => {
//   return knex
//     .select('loyalty_orders.*')
//     .from('loyalty_orders')
//     .join(
//       'payment_statuses',
//       'loyalty_orders.id',
//       'payment_statuses.reference_order_id'
//     )
//     .joinRaw(
//       `
//       LEFT JOIN transactions ON loyalty_orders.id = transactions.reference_order_id
//       `
//     )
//     .where('payment_statuses.name', 'PAYMENT_SUCCESS')
//     .whereNull('transactions.id')
//     .then(loyaltyOrders => {
//       const transactions = [];
//       let node;
//       loyaltyOrders.forEach(loyaltyOrder => {
//         node = {
//           id: uuid.get(),
//           reference_order_id: loyaltyOrder.id,
//           order_type: 'LOYALTY_ORDER',
//           customer_id: loyaltyOrder.customer_id,
//           action: 'COFE_CREDIT',
//           type: 'CREDITED',
//           amount: loyaltyOrder.amount,
//           created: loyaltyOrder.created_at,
//           updated: loyaltyOrder.created_at,
//         };
//         transactions.push(node);
//       });
//       return knex('transactions').insert(transactions);
//     });
// };
exports.up = () => Promise.resolve();
exports.down = () => {};
