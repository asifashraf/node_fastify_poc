const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('shipping_policies', table => {
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
        .uuid('country_id')
        .references('id')
        .inTable('countries');
      table.string('name');
      table.string('property');
      table.string('comparision_operator', 100);
      table.string('value');
      table.specificType('cost', 'numeric(13,3)').default(0);
      table.integer('delivery_estimate').comment('in hours');
    })
    .then(() => knex.raw(onUpdateTrigger('shipping_policies')));

exports.down = knex => knex.schema.dropTable('shipping_policies');
