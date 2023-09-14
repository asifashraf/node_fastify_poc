exports.up = knex =>
  knex.schema.table('coupons', table => {
    table.string('hero_photo');
    table.string('description');
  });

exports.down = knex =>
  knex.schema.table('coupons', table => {
    table.dropColumn('hero_photo');
    table.dropColumn('description');
  });
