exports.up = knex =>
  knex.schema.table('customer_addresses', t => t.string('building_name'));
exports.down = knex =>
  knex.schema.table('customer_addresses', t => t.dropColumn('building_name'));
