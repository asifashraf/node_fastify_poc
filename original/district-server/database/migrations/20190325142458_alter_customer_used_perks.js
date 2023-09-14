exports.up = knex =>
  knex.schema.table('customer_used_perks', table => {
    table.dropColumn('reward_tier_perk_id');
    table.dropColumn('brand_id');
    table
      .string('type')
      .notNullable()
      .index();
    table
      .uuid('reward_id')
      .references('id')
      .inTable('rewards')
      .index()
      .notNullable();
    table.specificType('total', 'numeric(13, 3)').defaultTo(0);
  });

exports.down = knex =>
  knex.schema.table('customer_used_perks', table => {
    table
      .uuid('reward_tier_perk_id')
      .references('id')
      .inTable('reward_tier_perks')
      .index()
      .notNullable();
    table
      .uuid('brand_id')
      .references('id')
      .inTable('brands')
      .index()
      .notNullable();
    table.dropColumn('reward_id');
    table.dropColumn('type');
    table.dropColumn('total');
  });
