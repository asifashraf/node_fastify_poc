exports.up = knex =>
  knex.schema.alterTable('coupons', table => {
    table.boolean('with_reward').notNullable().defaultTo(true).alter();
    table.boolean('with_discovery_credit').notNullable().defaultTo(true).alter();
  });

exports.down = knex =>
  knex.schema.alterTable('coupons', table => {
    table.boolean('with_reward').notNullable().defaultTo(false).alter();
    table.boolean('with_discovery_credit').notNullable().defaultTo(false).alter();
  });
