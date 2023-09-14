/* eslint-disable camelcase */
const knex = require('../../database');
console.log('Running: add-default-currency-id-for-order-set-transactions');

knex
  .select('transactions.*', 'order_sets.brand_location_id')
  .from('transactions')
  .join('order_sets', 'order_sets.id', 'transactions.reference_order_id')
  .where('transactions.order_type', 'ORDER_SET')
  .whereNull('transactions.currency_id')
  .then(transactions => {
    let brandLocation;
    const runTransactions = [];
    transactions.forEach(async transaction => {
      brandLocation = await knex()
        .select('currency_id')
        .from('brand_locations')
        .where({ id: transaction.brand_location_id })
        .first();
      runTransactions.push({
        id: transaction.id,
        currency_id: brandLocation.currency_id,
      });
    });

    return knex
      .transaction(trx => {
        return knex
          .select(1)
          .then(() => {
            return Promise.all(
              runTransactions.map(runTransaction => {
                return knex('transactions')
                  .update({
                    currency_id: runTransaction.currency_id,
                  })
                  .where('id', '=', runTransaction.id)
                  .transacting(trx);
              })
            );
          })
          .then(trx.commit)
          .catch(trx.rollback);
      })
      .then(() => {
        console.log('Transaction complete.');
      })
      .catch(err => {
        console.error(err);
      });
  })
  .then(() => {
    console.log('all done!');
    return knex.destroy();
  });
