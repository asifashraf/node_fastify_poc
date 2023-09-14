exports.up = knex =>
  knex.schema.table('countries', table => {
    table.string('dial_code', 15);
    table.string('iso_code', 32);
  });

exports.down = knex =>
  knex.schema.table('countries', table => {
    table.dropColumn('dial_code');
    table.dropColumn('iso_code');
  });
