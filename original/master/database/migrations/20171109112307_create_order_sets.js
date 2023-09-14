exports.up = knex =>
  knex.schema.createTable('order_sets', table => {
    table.uuid('id').primary();
    table
      .datetime('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());
  });

exports.down = knex => knex.schema.dropTable('order_sets');
