exports.up = knex =>
  knex.schema.createTable('neighborhoods', table => {
    table.uuid('id').primary();
    table.string('name').notNullable();
  });

exports.down = knex => knex.schema.dropTable('neighborhoods');
