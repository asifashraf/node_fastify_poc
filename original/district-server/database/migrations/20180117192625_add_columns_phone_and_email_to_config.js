exports.up = knex =>
  knex.schema.table('configuration', table => {
    table.string('phone');
    table.string('email');
  });

exports.down = knex =>
  knex.schema.table('configuration', table => {
    table.dropColumn('phone');
    table.dropColumn('email');
  });
