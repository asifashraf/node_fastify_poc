exports.up = knex =>
  knex.schema.createTable('menus', table => {
    table.uuid('id').primary();
  });

exports.down = knex => knex.schema.dropTable('menus');
