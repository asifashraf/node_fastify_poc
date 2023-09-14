exports.up = knex =>
  knex.schema.table('rewards', table => {
    table.dropColumn('status');
  });

exports.down = knex =>
  knex.schema.table('rewards', table => {
    table.integer('status');
  });
