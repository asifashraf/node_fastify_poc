exports.up = knex =>
  knex.schema.alterTable('order_sets', table => {
    table
      .uuid('currency_id')
      .references('id')
      .inTable('currencies')
      .index();
  });

exports.down = knex =>
  knex.schema.table('order_sets', table => {
    table.dropColumn('currency_id');
  });
