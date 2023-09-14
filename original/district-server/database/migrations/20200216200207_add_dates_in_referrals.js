exports.up = knex =>
  knex.schema.alterTable('referrals', table => {
    table.datetime('joined_at');
    table.datetime('received_at');
  });

exports.down = knex =>
  knex.schema.table('referrals', table => {
    table.dropColumn('joined_at');
    table.dropColumn('received_at');
  });
