const { onUpdateTrigger } = require('../../knexfile.js');
exports.up = knex =>
  knex.schema
    .alterTable('gift_card_batches', table => {
      table
        .timestamp('created')
        .notNullable()
        .defaultTo(knex.fn.now());
      table
        .timestamp('updated')
        .notNullable()
        .defaultTo(knex.fn.now());
    })
    .then(() => knex.raw(onUpdateTrigger('gift_card_batches')));

exports.down = knex =>
  knex.schema.table('gift_card_batches', table => {
    table.dropColumn('created');
    table.dropColumn('updated');
  });
