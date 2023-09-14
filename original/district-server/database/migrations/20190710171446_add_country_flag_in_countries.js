exports.up = knex =>
  knex.schema.table('countries', table => {
    table.string('flag_photo');
  });

exports.down = knex =>
  knex.schema.table('countries', table => {
    table.dropColumn('flag_photo');
  });
