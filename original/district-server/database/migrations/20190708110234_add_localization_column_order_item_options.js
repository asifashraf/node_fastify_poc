exports.up = knex =>
  knex.schema.table('order_item_options', table => {
    table
      .string('value_ar')
      .default('')
      .notNullable();
  });

exports.down = knex =>
  knex.schema.table('order_item_options', table => {
    table.dropColumn('value_ar');
  });
