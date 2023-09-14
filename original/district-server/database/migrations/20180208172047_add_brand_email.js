exports.up = knex =>
  knex.schema.table('brands', table => {
    table.string('brand_wide_order_queue_login_email');
  });

exports.down = knex =>
  knex.schema.table('brands', table => {
    table.dropColumn('brand_wide_order_queue_login_email');
  });
