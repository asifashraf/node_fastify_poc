exports.up = knex =>
  knex.schema.alterTable('referrals', table => {
    table
      .uuid('sender_currency_id')
      .references('id')
      .inTable('currencies')
      .index();
    table
      .uuid('receiver_currency_id')
      .references('id')
      .inTable('currencies')
      .index();
  });

exports.down = knex =>
  knex.schema.table('referrals', table => {
    table.dropColumn('sender_currency_id');
    table.dropColumn('receiver_currency_id');
  });
