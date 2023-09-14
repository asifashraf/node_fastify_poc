const { onUpdateTrigger } = require('../../knexfile.js');

const tableName = 'partner_requests';

exports.up = knex =>
  knex.schema
    .createTable(tableName, table => {
      table.string('id').primary();
      table.string('name');
      table.string('shop_name');
      table.string('email').index();
      table.string('phone_number').index();
      table.string('website');
      table.string('country');
      table.string('pos');
      table.string('logo');
      table.string('menu');
      table.text('mission').defaultTo('');
      table.string('services');
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
