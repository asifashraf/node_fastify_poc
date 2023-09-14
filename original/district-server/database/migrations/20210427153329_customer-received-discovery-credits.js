exports.up = knex =>
  knex.schema.alterTable('customers', table => {
    table
      .boolean('discovery_credits_received')
      .index()
      .default(false);
  });

exports.down = knex =>
  knex.schema.alterTable('customers', table => {
    table.dropColumn('discovery_credits_received');
  });
