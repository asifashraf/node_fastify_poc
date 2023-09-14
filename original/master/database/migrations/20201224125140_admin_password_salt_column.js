exports.up = knex =>
  knex.schema.table('admins', table => {
    table.string('salt').defaultTo(null);
  });

exports.down = knex =>
  knex.schema.table('admins', table => {
    table.dropColumn('salt');
  });
