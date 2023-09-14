exports.up = knex =>
  knex.schema.table('countries', table => {
    table.dropColumn('code');
  });

exports.down = knex =>
  knex.schema.table('countries', table => {
    table.string('code', 32);
  });
