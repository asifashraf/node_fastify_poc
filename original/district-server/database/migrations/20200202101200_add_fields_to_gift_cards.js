exports.up = knex =>
  knex.schema.alterTable('gift_cards', table => {
    table
      .uuid('country_id')
      .references('id')
      .inTable('countries')
      .index();
    table
      .uuid('currency_id')
      .references('id')
      .inTable('currencies')
      .index();
    table.string('name');
    table.string('name_ar');
    table.string('message');
  });

exports.down = knex =>
  knex.schema.table('gift_cards', table => {
    table.dropColumn('country_id');
    table.dropColumn('currency_id');
    table.dropColumn('name');
    table.dropColumn('name_ar');
    table.dropColumn('message');
  });
