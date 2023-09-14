exports.up = knex =>
  knex.schema.table('menu_sections', table => {
    table
      .string('name_ar')
      .default('')
      .notNullable();
  });

exports.down = knex =>
  knex.schema.table('menu_sections', table => {
    table.dropColumn('name_ar');
  });
