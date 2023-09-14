exports.up = knex =>
  knex.schema.alterTable('order_sets', table => {
    table.json('pre_paid'); // payload formatted for pre-paid
  });

exports.down = knex =>
  knex.schema.alterTable('order_sets', table => {
    table.dropColumn('pre_paid');
  });
