exports.up = knex =>
  knex.schema.alterTable('gift_cards', table => {
    table
      .uuid('brand_id')
      .references('id')
      .inTable('brands')
      .index();
  });

exports.down = knex =>
  knex.schema.table('gift_cards', table => {
    table.dropColumn('brand_id');
  });
