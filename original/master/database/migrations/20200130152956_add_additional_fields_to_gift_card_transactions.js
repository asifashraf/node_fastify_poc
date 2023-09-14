exports.up = knex =>
  knex.schema.alterTable('gift_card_transactions', table => {
    table
      .uuid('currency_id')
      .references('id')
      .inTable('currencies')
      .index();
    table
      .string('customer_id')
      .references('id')
      .inTable('customers')
      .index()
      .notNullable();
    table
      .string('reference_order_id')
      .notNullable()
      .unique();
    table
      .specificType('credit', 'numeric(13, 3)')
      .notNullable()
      .default(0)
      .alter();
    table
      .specificType('debit', 'numeric(13, 3)')
      .notNullable()
      .default(0)
      .alter();
  });

exports.down = knex =>
  knex.schema.table('gift_card_transactions', table => {
    table.dropColumn('currency_id');
    table.dropColumn('customer_id');
    table.dropColumn('reference_order_id');
    table
      .specificType('credit', 'numeric(13, 3)')
      .notNullable()
      .alter();
    table
      .specificType('debit', 'numeric(13, 3)')
      .notNullable()
      .alter();
  });
