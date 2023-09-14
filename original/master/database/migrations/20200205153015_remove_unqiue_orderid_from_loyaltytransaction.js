exports.up = knex =>
  knex.schema.alterTable('loyalty_transactions', table => {
    table.dropUnique('reference_order_id');
  });

exports.down = knex =>
  knex.schema.table('loyalty_transactions', table => {
    table.unique('reference_order_id');
  });
