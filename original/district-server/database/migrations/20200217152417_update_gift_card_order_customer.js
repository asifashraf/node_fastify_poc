exports.up = knex =>
  knex.schema.alterTable('gift_card_orders', table => {
    table
      .string('customer_id')
      .nullable()
      .alter();
  });

exports.down = knex =>
  knex.schema.table('gift_card_orders', table => {
    table
      .string('customer_id')
      .notNullable()
      .alter();
  });
