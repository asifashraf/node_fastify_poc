exports.up = knex =>
  knex.schema.table('customer_perks', table => {
    table.dropColumn('brand_id');
    table
      .uuid('reward_id')
      .references('id')
      .inTable('rewards')
      .index()
      .notNullable();
    table.specificType('total', 'numeric(13, 3)').defaultTo(0);
  });

exports.down = knex =>
  knex.schema.table('customer_perks', table => {
    table
      .uuid('brand_id')
      .references('id')
      .inTable('brands')
      .index()
      .notNullable();
    table.dropColumn('reward_id');
    table.dropColumn('total');
  });
