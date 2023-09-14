exports.up = async knex => {
    await knex.schema.table('gift_cards', table => {
      table.unique('gift_card_order_id');
    });
  };
  
  exports.down = async knex => {
    await knex.schema.table('gift_cards', table => {
      table.dropUnique('gift_card_order_id');
    });
  };
  