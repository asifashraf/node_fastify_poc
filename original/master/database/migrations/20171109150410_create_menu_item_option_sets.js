exports.up = knex =>
  knex.schema.createTable('menu_item_option_sets', table => {
    table.uuid('id').primary();
    table.string('label').notNullable();
    table.boolean('single').notNullable();
  });

exports.down = knex => knex.schema.dropTable('menu_item_option_sets');
