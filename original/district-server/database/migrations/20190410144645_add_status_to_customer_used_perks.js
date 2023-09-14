exports.up = knex =>
  knex.schema.table('customer_used_perks', table => {
    table.integer('status').default(1);
  });

exports.down = knex =>
  knex.schema.table('customer_used_perks', table => {
    table.dropColumn('status');
  });
