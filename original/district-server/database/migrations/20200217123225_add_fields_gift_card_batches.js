exports.up = knex =>
  knex.schema.alterTable('gift_card_batches', table => {
    table.string('name');
    table.string('email');
    table.string('phone_number');
  });

exports.down = knex =>
  knex.schema.table('gift_card_batches', table => {
    table.dropColumn('name');
    table.dropColumn('email');
    table.dropColumn('phone_number');
  });
