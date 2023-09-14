exports.up = knex =>
  knex.schema.alterTable('loyalty_orders', table => {
    table.string('bonus_type', 32);
    table.integer('bonus_value');
  });

exports.down = knex =>
  knex.schema.alterTable('loyalty_orders', table => {
    table.dropColumn('bonus_type');
    table.dropColumn('bonus_value');
  });
