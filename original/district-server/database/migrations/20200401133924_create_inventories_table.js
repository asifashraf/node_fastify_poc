const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('inventories', table => {
      table.uuid('id').primary();
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .uuid('pickup_location_id')
        .references('id')
        .inTable('pickup_locations');
      table
        .string('reference_type', 100)
        .index()
        .notNullable();
      table
        .string('reference_id')
        .index()
        .notNullable();
      table.integer('quantity').default(0);
      table.string('sku').index();
      table.string('barcode').index();
      table.unique(['pickup_location_id', 'reference_type', 'reference_id']);
    })
    .then(() => knex.raw(onUpdateTrigger('inventories')));

exports.down = knex => knex.schema.dropTable('inventories');
