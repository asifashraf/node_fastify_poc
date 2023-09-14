exports.up = knex =>
  knex.schema.table('delivery_addresses', table =>
    table.string('terminal_number')
  );

exports.down = knex =>
  knex.schema.table('delivery_addresses', table =>
    table.dropColumn('terminal_number')
  );
