exports.up = knex =>
  knex.schema.table('banners', table => {
    table
      .string('size')
      .default('SMALL')
      .notNullable();
  });

exports.down = knex =>
  knex.schema.table('banners', table => {
    table.dropColumn('size');
  });
