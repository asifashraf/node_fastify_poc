exports.up = knex =>
  knex.schema.alterTable('coupons', table => {
    table
      .uuid('customer_group_id')
      .references('id')
      .inTable('customer_groups');
  });

exports.down = knex =>
  knex.schema.alterTable('coupons', table => {
    table.dropColumn('customer_group_id');
  });
