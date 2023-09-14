exports.up = knex =>
  knex.schema.alterTable('gift_card_transactions', table => {
    table
      .string('customer_id')
      .nullable()
      .alter();
    table
      .string('reference_order_id')
      .nullable()
      .alter();
  });

exports.down = knex =>
  knex.schema.table('gift_card_transactions', table => {
    table
      .string('customer_id')
      .notNullable()
      .alter();
    table
      .string('reference_order_id')
      .notNullable()
      .alter();
  });
