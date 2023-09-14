exports.up = knex =>
  knex.schema.table('customer_tiers', table => {
    table.string('move', 32).notNullable().index();
  });

exports.down = knex =>
  knex.schema.table('customer_tiers', table => {
    table.dropColumn('move');
  });
