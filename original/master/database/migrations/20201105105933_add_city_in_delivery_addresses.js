exports.up = knex =>
  knex.schema.table('delivery_addresses', table => table.string('city'));

exports.down = knex =>
  knex.schema.table('delivery_addresses', table => table.dropColumn('city'));
