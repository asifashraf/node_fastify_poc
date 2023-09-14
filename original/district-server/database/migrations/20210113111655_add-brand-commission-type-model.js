const { onUpdateTrigger } = require('../../knexfile.js');

const tableName = 'brand_commission_models';

exports.up = knex =>
  knex.schema
    .createTable(tableName, table => {
      table.uuid('id').primary();
      table
        .uuid('brand_id')
        .references('id')
        .inTable('brands')
        .index()
        .notNullable();
      table
        .string('type')
        .index()
        .notNullable();
      table.specificType('percentage', 'numeric(5, 3)').comment('percentage');
      table.datetime('start_time').notNullable();
      table.datetime('end_time');
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
    })
    .then(() => knex.raw(onUpdateTrigger(tableName)));

exports.down = knex => knex.schema.dropTable(tableName);
