exports.up = knex =>
  knex.schema.table('reward_tiers', table => {
    table
      .string('title_ar')
      .default('')
      .notNullable();
  });

exports.down = knex =>
  knex.schema.table('reward_tiers', table => {
    table.dropColumn('title_ar');
  });
