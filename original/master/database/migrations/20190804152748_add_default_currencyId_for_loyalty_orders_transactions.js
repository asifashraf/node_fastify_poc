// exports.up = knex => {
//   return knex
//     .select('transactions.*')
//     .from('transactions')
//     .where('transactions.order_type', 'LOYALTY_ORDER')
//     .whereNull('transactions.currency_id')
//     .then(async transactions => {
//       let brandLocation;
//       const runTransactions = [];
//       // setting up this currency as default for all the old loyalty orders
//       const currency = await knex()
//         .select('currencies.id')
//         .from('currencies')
//         .where({ code: 'KD' })
//         .first();
//       if (currency) {
//         transactions.forEach(transaction => {
//           runTransactions.push({
//             id: transaction.id,
//             currency_id: currency.id,
//           });
//         });
//       }
//
//       return knex.transaction(trx => {
//         return knex
//           .select(1)
//           .then(() => {
//             return Promise.all(
//               runTransactions.map(runTransaction => {
//                 return knex('transactions')
//                   .update({
//                     currency_id: runTransaction.currency_id,
//                   })
//                   .where('id', '=', runTransaction.id)
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
