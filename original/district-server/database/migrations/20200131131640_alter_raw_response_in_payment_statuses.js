exports.up = knex =>
  knex.schema.alterTable('payment_statuses', table => {
    table.text('raw_response').alter();
  });

exports.down = knex =>
  knex.schema.alterTable('payment_statuses', table => {
    table.string('raw_response', 1024).alter();
  });
