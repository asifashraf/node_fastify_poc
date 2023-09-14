exports.up = knex =>
  knex.schema.alterTable('loyalty_transactions', table => {
    table
      .uuid('currency_id')
      .references('id')
      .inTable('currencies')
      .index();
  });

exports.down = knex =>
  knex.schema.table('loyalty_transactions', table => {
    table.dropColumn('currency_id');
  });
