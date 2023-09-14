exports.up = knex =>
  knex.schema.table('brands', table => {
    table.string('profile_video');
  });

exports.down = knex =>
  knex.schema.table('brands', table => {
    table.dropColumn('profile_video');
  });
