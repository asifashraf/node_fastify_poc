exports.up = knex =>
  knex.schema.createTable('gift_card_batch_receivers', table => {
    table.uuid('id').primary();
    table
      .uuid('gift_card_batch_id')
      .references('id')
      .inTable('gift_card_batches')
      .index()
      .notNullable();
    table
      .uuid('gift_card_id')
      .references('id')
      .inTable('gift_cards')
      .index();
    table.string('email');
    table.string('phone_number');
    table.timestamp('sent_on');
  });

exports.down = knex => knex.schema.dropTable('gift_card_batch_receivers');
