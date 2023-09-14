exports.up = knex =>
  knex.schema.table('delivery_addresses', table =>
    table.string('gate_number')
  );

exports.down = knex =>
  knex.schema.table('delivery_addresses', table =>
    table.dropColumn('gate_number')
  );
