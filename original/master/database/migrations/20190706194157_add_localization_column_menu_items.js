exports.up = knex =>
  knex.schema.table('menu_items', table => {
    table
      .string('name_ar')
      .default('')
      .notNullable();
  });

exports.down = knex =>
  knex.schema.table('menu_items', table => {
    table.dropColumn('name_ar');
  });
