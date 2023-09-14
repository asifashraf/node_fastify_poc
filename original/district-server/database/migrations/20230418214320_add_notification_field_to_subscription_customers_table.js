exports.up = knex =>
  knex.schema.alterTable('subscription_customers', table => {
    table.json('notifications');
  });

exports.down = knex =>
  knex.schema.table('subscription_customers', table => {
    table.dropColumn('notifications');
  });
