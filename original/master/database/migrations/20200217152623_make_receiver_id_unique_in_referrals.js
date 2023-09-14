exports.up = knex =>
  knex.schema.alterTable('referrals', table => {
    table.unique('receiver_id');
  });

exports.down = knex =>
  knex.schema.table('referrals', table => {
    table.dropUnique('receiver_id');
  });
