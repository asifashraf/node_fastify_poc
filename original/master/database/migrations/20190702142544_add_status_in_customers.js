exports.up = knex =>
  knex.schema.table('customers', table => {
    table.string('status', 50);
  });

exports.down = knex =>
  knex.schema.table('customers', table => {
    table.dropColumn('status');
  });
