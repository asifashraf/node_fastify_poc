exports.up = async knex => {
  // Get the Current Data
  const fixedData = await knex
    .raw(
      'select customer_id,coupon_id,1 as redemptions from customers_coupons group by customer_id,coupon_id '
    )
    .then(result => result.rows);

  await knex.raw('TRUNCATE TABLE customers_coupons');
  await knex('customers_coupons').insert(fixedData);

  await knex.schema.alterTable('customers_coupons', table => {
    table.unique(['customer_id', 'coupon_id']);
  });
};

exports.down = knex =>
  knex.schema.raw(
    'alter table customers_coupons drop CONSTRAINT customers_coupons_customer_id_coupon_id_unique'
  );
