exports.up = knex =>
  knex.schema.alterTable('loyalty_orders', table => {
    table
      .uuid('currency_id')
      .references('id')
      .inTable('currencies')
      .index();
    table
      .uuid('loyalty_tier_id')
      .references('id')
      .inTable('loyalty_tiers')
      .index();
  });

exports.down = knex =>
  knex.schema.table('loyalty_orders', table => {
    table.dropColumn('currency_id');
    table.dropColumn('loyalty_tier_id');
  });
