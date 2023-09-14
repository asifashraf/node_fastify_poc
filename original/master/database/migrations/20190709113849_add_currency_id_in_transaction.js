exports.up = knex =>
  knex.schema.table('transactions', table => {
    table.dropColumn('currency');
    table
      .uuid('currency_id')
      .references('id')
      .inTable('currencies')
      .index();
  });

exports.down = knex =>
  knex.schema.table('transactions', table => {
    table.dropColumn('currency_id');
    table.string('currency', 50);
  });
