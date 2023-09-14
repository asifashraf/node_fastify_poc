exports.up = knex =>
  knex.schema.table('admins', table => {
    table.dropColumn('role');
  });

exports.down = knex =>
  knex.schema.table('admins', table => {
    table.string('role', 32).defaultTo(null);
  });
