exports.up = knex =>
  knex.schema.alterTable('wallet_account_cashbacks', table => {
    table.boolean('deprecated').defaultTo(true);
    table.boolean('expired').defaultTo(false);
    table
      .uuid('coupon_id')
      .nullable()
      .alter();
  });

exports.down = knex =>
  knex.schema.table('wallet_account_cashbacks', table => {
    table.dropColumn('deprecated');
    table.dropColumn('expired');
    table
      .uuid('coupon_id')
      .notNullable()
      .alter();
  });
