exports.up = knex =>
  knex.schema.table('rewards', table => {
    table.string('status', 32).defaultTo(null);
  });

exports.down = knex =>
  knex.schema.table('rewards', table => {
    table.dropColumn('status');
  });
