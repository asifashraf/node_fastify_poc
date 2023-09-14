exports.up = knex =>
  knex.schema.table('brands', table => {
    table.string('profile_photo');
  });

exports.down = knex =>
  knex.schema.table('brands', table => {
    table.dropColumn('profile_photo');
  });
