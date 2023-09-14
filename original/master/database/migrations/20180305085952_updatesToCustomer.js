exports.up = knex =>
  knex.schema.table('customers', table => {
    table.string('loyalty_tier');
  });

exports.down = knex =>
  knex.schema.table('customers', table => {
    table.dropColumn('loyalty_tier');
  });
