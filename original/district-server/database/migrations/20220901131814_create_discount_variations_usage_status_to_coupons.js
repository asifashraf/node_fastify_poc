exports.up = knex =>
  knex.schema.table('coupons', table => {
    table.boolean('with_reward').notNullable().defaultTo(false);
    table.boolean('with_discovery_credit').notNullable().defaultTo(false);
  });

exports.down = knex =>
  knex.schema.table('coupons', table => {
    table.dropColumn('with_reward');
    table.dropColumn('with_discovery_credit');
  });
