/* eslint-disable camelcase */
const { uuid } = require('../lib/util');
const knex = require('../../database');
const { couponType } = require('../schema/root/enums');

knex
  .transaction(async trx => {
    const { rows } = await trx.raw(`SELECT * FROM coupons`);
    const transactions = [];
    rows.map(row => {
      let type = null;
      let amount = null;
      if (row.flat_amount) {
        type = couponType.FLAT_AMOUNT;
        amount = row.flat_amount;
      } else if (row.percentage) {
        type = couponType.PERCENTAGE;
        amount = row.percentage;
      }
      if (type && amount) {
        const couponDetail = {
          id: uuid.get(),
          coupon_id: row.id,
          type,
          amount,
        };
        transactions.push(trx('coupon_details').insert(couponDetail));
      }
      return row;
    });

    return Promise.all(transactions);
  })
  .then(() => {
    console.log('all done!');
    return knex.destroy();
  })
  .catch(err => {
    console.log('error', err);
    return knex.destroy();
  });
