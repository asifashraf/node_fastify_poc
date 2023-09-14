const { onUpdateTrigger } = require('../../knexfile.js');

const tableName = 'admin_branch_subscription';

exports.up = knex =>
  knex.schema
    .createTable(tableName, table => {
      table.uuid('id').primary();
      table.uuid('admin_id');
      table
        .uuid('branch_id')
        .index()
        .notNullable();
      table.string('subscription_token').notNullable();
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .foreign('admin_id')
        .references('id')
        .inTable('admins')
        .onDelete('CASCADE')
        .onUpdate('CASCADE');
      table
        .foreign('branch_id')
        .references('id')
        .inTable('brand_locations')
        .onDelete('CASCADE')
        .onUpdate('CASCADE');
    })
    .then(() => knex.raw(onUpdateTrigger(tableName)));

exports.down = knex => knex.schema.dropTable(tableName);
