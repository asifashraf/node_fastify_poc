exports.up = knex =>
  knex.schema.alterTable('gift_cards', table => {
    table.string('share_url');
  });

exports.down = knex =>
  knex.schema.table('gift_cards', table => {
    table.dropColumn('share_url');
  });
