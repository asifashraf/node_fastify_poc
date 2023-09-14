exports.up = knex =>
  knex.schema.createTable('nutritional_info', table => {
    table.uuid('id').primary();
    table.integer('calories');
    table.integer('fat');
    table.integer('carbohydrates');
    table.string('allergens');
  });

exports.down = knex => knex.schema.dropTable('nutritional_info');
