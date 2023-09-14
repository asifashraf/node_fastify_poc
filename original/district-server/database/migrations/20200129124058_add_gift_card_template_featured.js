exports.up = knex =>
  knex.schema.alterTable('gift_card_templates', table => {
    table
      .boolean('is_featured')
      .default(false)
      .notNullable();
  });

exports.down = knex =>
  knex.schema.table('gift_card_templates', table => {
    table.dropColumn('is_featured');
  });
