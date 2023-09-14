const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = knex => {
  return knex.schema
    .createTable('loyalty_bonuses', table => {
      table.uuid('id').primary();
      table
        .uuid('loyalty_tier_id')
        .index()
        .references('id')
        .inTable('loyalty_tiers')
        .onDelete('CASCADE');
      table
        .string('type', 32)
        .defaultTo('flat')
        .notNullable();
      table
        .integer('value')
        .defaultTo(0)
        .notNullable();
      table
        .integer('lower_bound')
        .defaultTo(0)
        .notNullable();
      table.integer('upper_bound');
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
    })
    .then(() => knex.raw(onUpdateTrigger('loyalty_bonuses')));
};

exports.down = knex => {
  return knex.schema.dropTable('loyalty_bonuses');
};
