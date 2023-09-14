/* eslint-disable camelcase */
const knex = require('../../database');
console.log('Running: set-order-set-id-in-order-fulfillment');
knex
  .select()
  .from('order_fulfillment')
  .whereNull('order_set_id')
  .limit(10000)
  .then(async orderFulfillments => {
    orderFulfillments.forEach(async orderFulfillment => {
      orderFulfillment.order_set_id = null;
      if (orderFulfillment) {
        const orderSet = await knex()
          .select('order_set_id')
          .from('orders')
          .where({ id: orderFulfillment.order_id })
          .first();

        if (orderSet) {
          if (orderSet.order_set_id) {
            orderFulfillment.order_set_id = orderSet.order_set_id;
          }
        }
      }
    });

    return knex
      .transaction(trx => {
        return knex
          .select(1)
          .then(() => {
            return Promise.all(
              orderFulfillments.map(row => {
                return knex('order_fulfillment')
                  .update({
                    order_set_id: row.order_set_id,
                  })
                  .where('order_id', '=', row.order_id)
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
