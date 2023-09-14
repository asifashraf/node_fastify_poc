exports.up = knex =>
  knex.schema.table('delivery_addresses', table =>
    table.string('airport_name')
  );

exports.down = knex =>
  knex.schema.table('delivery_addresses', table =>
    table.dropColumn('airport_name')
  );
