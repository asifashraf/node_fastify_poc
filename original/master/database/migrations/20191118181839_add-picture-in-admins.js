exports.up = knex =>
  knex.schema.alterTable('admins', table => {
    table.string('picture');
  });

exports.down = knex =>
  knex.schema.table('admins', table => {
    table.dropColumn('picture');
  });
