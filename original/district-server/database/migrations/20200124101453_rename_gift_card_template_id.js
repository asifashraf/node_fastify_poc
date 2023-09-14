exports.up = knex =>
  knex.schema.alterTable('gift_cards', table => {
    table.renameColumn('gift_card_template', 'gift_card_template_id');
  });

exports.down = knex =>
  knex.schema.table('gift_cards', table => {
    table.renameColumn('gift_card_template_id', 'gift_card_template');
  });
