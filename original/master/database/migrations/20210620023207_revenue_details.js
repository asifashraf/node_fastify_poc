const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('order_revenues', table => {
      table.uuid('id').primary();
      table
        .string('order_type')
        .index()
        .notNullable();
      table
        .string('reference_order_id')
        .index()
        .notNullable();
      table.boolean('new_customer').default(false);

      table.specificType('cofe_revenue', 'numeric(13, 3)').default(0.0);
      table.specificType('vendor_revenue', 'numeric(13, 3)').default(0.0);
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
    })
    .then(() => knex.raw(onUpdateTrigger('order_revenues')));

exports.down = knex => knex.schema.dropTable('order_revenues');
