exports.up = knex =>
  knex.schema.createTable('allergens', table => {
    table.uuid('id').primary();
    table.string('name').notNullable();
  });

exports.down = knex => knex.schema.dropTable('allergens');
