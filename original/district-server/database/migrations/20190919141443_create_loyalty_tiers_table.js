const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex =>
  knex.schema
    .createTable('loyalty_tiers', table => {
      table.uuid('id').primary();
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
      table.string('name').index();
      table.string('sku', 20).index();
      table.specificType('amount', 'numeric(13, 3)');
      table.boolean('custom_amount').defaultTo(false);
      table.string('color_tint');
      table.specificType('bonus', 'numeric(13, 3)');
      table
        .uuid('country_id')
        .references('id')
        .inTable('countries')
        .index();
      table
        .uuid('currency_id')
        .references('id')
        .inTable('currencies')
        .index();
    })
    .then(() => knex.raw(onUpdateTrigger('loyalty_tiers')));

exports.down = knex => knex.schema.dropTable('loyalty_tiers');
