exports.up = knex =>
  knex.schema.table('reward_tier_perks', table => {
    table
      .string('title_ar')
      .default('')
      .notNullable();
  });

exports.down = knex =>
  knex.schema.table('reward_tier_perks', table => {
    table.dropColumn('title_ar');
  });
