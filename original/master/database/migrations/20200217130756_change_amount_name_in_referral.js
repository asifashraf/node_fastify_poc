exports.up = knex =>
  knex.schema.alterTable('referrals', table => {
    table.renameColumn('sent_amount', 'sender_amount');
    table.renameColumn('received_amount', 'receiver_amount');
  });

exports.down = knex =>
  knex.schema.alterTable('referrals', table => {
    table.renameColumn('sender_amount', 'sent_amount');
    table.renameColumn('receiver_amount', 'received_amount');
  });
