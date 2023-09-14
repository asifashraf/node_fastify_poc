exports.up = knex =>
  knex.schema.createTable('order_fulfillment', table => {
    table.uuid('id').primary();
    table.string('type').notNullable();
    table.datetime('time');
    table
      .specificType('fee', 'numeric(13, 3)')
      .default(0)
      .notNullable();
    table.text('note');
  });

exports.down = knex => knex.schema.dropTable('order_fulfillment');
