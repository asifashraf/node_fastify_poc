exports.up = knex =>
  knex.schema.createTable('menu_sections', table => {
    table.uuid('id').primary();
    table.string('name').notNullable();
  });

exports.down = knex => knex.schema.dropTable('menu_sections');
