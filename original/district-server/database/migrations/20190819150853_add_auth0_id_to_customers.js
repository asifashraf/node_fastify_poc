exports.up = knex =>
  knex.schema.table('customers', table => {
    table.string('autho_id');
  });

exports.down = knex =>
  knex.schema.table('customers', table => {
    table.dropColumn('autho_id');
  });
