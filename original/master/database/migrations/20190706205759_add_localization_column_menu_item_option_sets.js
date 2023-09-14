exports.up = knex =>
  knex.schema.table('menu_item_option_sets', table => {
    table
      .string('label_ar')
      .default('')
      .notNullable();
  });

exports.down = knex =>
  knex.schema.table('menu_item_option_sets', table => {
    table.dropColumn('label_ar');
  });
