const { onUpdateTrigger } = require('../../knexfile.js');

const tableName = 'bank_cards';

exports.up = knex =>
  knex.schema
    .createTable(tableName, table => {
      table.uuid('id').primary();
      table
        .string('identifier', 6)
        .index()
        .notNullable()
        .unique();
      table.string('name', 128).notNullable();
      table
        .uuid('bank_id')
        .index()
        .notNullable();
      table
        .string('status', 32)
        .notNullable()
        .defaultTo('ACTIVE');
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .foreign('bank_id')
        .references('id')
        .inTable('banks')
        .onDelete('CASCADE')
        .onUpdate('CASCADE');
    })
    .then(() => knex.raw(onUpdateTrigger(tableName)));

exports.down = knex => knex.schema.dropTable(tableName);
