const { onUpdateTrigger } = require('../../knexfile.js');

const tableName = 'contact_us';

exports.up = knex =>
  knex.schema
    .createTable(tableName, table => {
      table.string('id').primary();
      table.string('name');
      table.string('email').index();
      table.string('phone_number').index();
      table.string('subject').defaultTo('');
      table.text('content').defaultTo('');
      table.boolean('newsletter');
      table.string('status');
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
