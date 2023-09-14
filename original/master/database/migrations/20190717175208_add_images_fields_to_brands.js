exports.up = knex =>
  knex.schema.table('brands', table => {
    table.string('hero_photo');
    table.string('carousel_image');
    table.string('favicon');
  });

exports.down = knex =>
  knex.schema.table('brands', table => {
    table.dropColumn('hero_photo');
    table.dropColumn('carousel_image');
    table.dropColumn('favicon');
  });
