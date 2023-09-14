const { statusTypes } = require('./../../src/schema/root/enums');

exports.up = knex =>
  knex.schema.createTable('brand_subscription_model', table => {
    table.string('id').primary();
    table
      .uuid('brand_id')
      .references('id')
      .inTable('brands')
      .index()
      .notNullable();
    table
      .uuid('country_id')
      .references('id')
      .inTable('countries')
      .index()
      .notNullable();
    table
      .uuid('currency_id')
      .references('id')
      .inTable('currencies')
      .index()
      .notNullable();
    table.timestamp('sign_date').notNullable();
    table.timestamp('expiry_date');
    table
      .boolean('auto_renewal')
      .default(false)
      .notNullable();
    table.string('revenue_model').notNullable();
    table.specificType('flat_rate', 'numeric(5, 3)');
    table
      .specificType('pickup_commission', 'numeric(5, 3)')
      .comment('percentage');
    table
      .specificType('delivery_commission', 'numeric(5, 3)')
      .comment('percentage');
    table
      .specificType('cofe_store_commission', 'numeric(5, 3)')
      .comment('percentage');
    table
      .timestamp('created')
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp('updated')
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .string('status')
      .defaultTo(statusTypes.ACTIVE)
      .notNullable();
  });

exports.down = knex => knex.schema.dropTable('brand_subscription_model');
