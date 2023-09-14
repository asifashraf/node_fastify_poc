exports.up = knex =>
  knex.schema.createTable('gift_card_batches', table => {
    table.uuid('id').primary();
    table
      .uuid('gift_card_template_id')
      .references('id')
      .inTable('gift_card_templates')
      .index()
      .notNullable();
    table.string('message');
    table.specificType('amount', 'numeric(13, 3)').notNullable();
    table.timestamp('delivery_date');
    table.string('delivery_method').notNullable();
    table.string('status').notNullable();
  });

exports.down = knex => knex.schema.dropTable('gift_card_batches');
