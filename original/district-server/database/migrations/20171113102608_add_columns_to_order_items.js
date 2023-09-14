exports.up = knex =>
  knex.schema.table('order_items', table => {
    table.string('name').notNullable();
    table.specificType('base_price', 'numeric(13, 3)');
  });

exports.down = knex =>
  knex.schema.table('order_items', table => {
    table.dropColumn('name');
    table.dropColumn('base_price');
  });
