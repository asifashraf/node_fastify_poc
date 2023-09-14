const { onUpdateTrigger } = require('../../knexfile.js');

const tableName = 'otp_activity_logs';

exports.up = knex =>
  knex.schema
    .createTable(tableName, table => {
      table
        .string('id')
        .primary()
        .notNullable();
      table.string('provider_type').notNullable();
      table.string('identifier').notNullable();
      table.string('otp_code', 6).notNullable();
      table.jsonb('provider_response');
      table.string('operation_type').notNullable();
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
