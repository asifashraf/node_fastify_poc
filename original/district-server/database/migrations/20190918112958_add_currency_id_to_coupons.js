exports.up = knex =>
  knex.schema.alterTable('coupons', table => {
    table
      .uuid('currency_id')
      .references('id')
      .inTable('currencies')
      .index();
  });

exports.down = knex =>
  knex.schema.table('coupons', table => {
    table.dropColumn('currency_id');
  });
