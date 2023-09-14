exports.up = knex =>
  knex.schema.table('menu_items', table => {
    table
      .string('item_description_ar')
      .default('')
      .notNullable();
  });

exports.down = knex =>
  knex.schema.table('menu_items', table => {
    table.dropColumn('item_description_ar');
  });
