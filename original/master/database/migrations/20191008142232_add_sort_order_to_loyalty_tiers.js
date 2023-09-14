exports.up = knex =>
  knex.schema.alterTable('loyalty_tiers', table => {
    table
      .integer('sort_order')
      .default(0)
      .notNullable();
  });

exports.down = knex =>
  knex.schema.table('loyalty_tiers', table => {
    table.dropColumn('sort_order');
  });
