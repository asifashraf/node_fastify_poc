exports.up = knex =>
  knex.schema.table('customer_addresses', table => table.string('city'));

exports.down = knex =>
  knex.schema.table('customer_addresses', table => table.dropColumn('city'));
