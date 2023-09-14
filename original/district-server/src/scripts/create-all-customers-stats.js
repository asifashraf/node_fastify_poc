const db = require('../../database');
const Promise = require('bluebird');
const { assign, get, first, map } = require('lodash');
const CustomerStats = require('../schema/customer-stats/model');
const { transformToSnakeCase } = require('../lib/util');

async function run(db) {
  const allCustomers = await getAllCustomers(db);

  console.log(`Got ${allCustomers.length} Customers`);

  Promise.all(
    map(allCustomers, async customer => {
      const customerId = customer.id;
      const totalOrders = await getOrderCountByCustomerId(db, customerId);
      const totalKdSpent = await getTotalKDSpentByCustomerId(db, customerId);

      console.log(
        'Creating/Updating Customer Stats for Customer:',
        customerId,
        totalOrders,
        totalKdSpent
      );

      const csModel = new CustomerStats(db, this);
      const cs = first(
        await csModel.db('customer_stats').where('customer_id', customerId)
      );

      const newCs = transformToSnakeCase(
        assign(cs, {
          customerId,
          totalOrders,
          totalKdSpent,
        })
      );

      return csModel.save(newCs);
    })
  ).then(() => {
    console.log('Process Complete. Have a nice day');
    db.destroy();
    // eslint-disable-next-line
    process.exit();
  });
}

function getAllCustomers(db) {
  return db('customers');
}

async function getOrderCountByCustomerId(db, customerId) {
  return db('orders')
    .select(db.raw('count(id) as order_count'))
    .with('customer_order_sets', qb => {
      qb.select('id')
        .from('order_sets')
        .where('customer_id', customerId);
    })
    .from('orders')
    .whereIn('order_set_id', x => {
      x.select(
        db.raw(`sq1.order_set_id
                      FROM (
                        SELECT name,reference_order_id as order_set_id,rank() OVER (PARTITION BY reference_order_id ORDER BY created_at DESC)
                        FROM payment_statuses where order_type='ORDER_SET' and reference_order_id in (select "id" from "customer_order_sets") ) sq1
                      where sq1.rank = 1 and sq1.name = 'PAYMENT_SUCCESS'`)
      );
    })
    .then(result => {
      return get(first(result), 'order_count', 0);
    }); // order_count => orderCount , thanks hooks
}

async function getTotalKDSpentByCustomerId(db, customerId) {
  return db('order_sets')
    .select(db.raw('coalesce(sum(total),0) as total_kd_spent'))
    .with('customer_order_sets', qb => {
      qb.select('id')
        .from('order_sets')
        .where('customer_id', customerId);
    })
    .from('order_sets')
    .whereIn('id', x => {
      x.select(
        db.raw(`sq1.order_set_id
                      FROM (
                        SELECT name,reference_order_id as order_set_id,rank() OVER (PARTITION BY reference_order_id ORDER BY created_at DESC)
                        FROM payment_statuses where order_type='ORDER_SET' and reference_order_id in (select "id" from "customer_order_sets") ) sq1
                      where sq1.rank = 1 and sq1.name = 'PAYMENT_SUCCESS'`)
      );
    })
    .then(result => get(first(result), 'total_kd_spent', 0));
}

run(db);
