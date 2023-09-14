exports.up = knex =>
  knex.schema.createTable('brands', table => {
    table.uuid('id').primary();
    table.string('name');
  });

exports.down = knex => knex.schema.dropTable('brands');
