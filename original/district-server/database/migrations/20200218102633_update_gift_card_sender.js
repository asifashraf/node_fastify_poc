exports.up = knex =>
  knex.schema.alterTable('gift_cards', table => {
    table
      .string('sender_id')
      .nullable()
      .alter();
  });

exports.down = knex =>
  knex.schema.table('gift_cards', table => {
    table
      .string('sender_id')
      .notNullable()
      .alter();
  });
