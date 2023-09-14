exports.up = knex =>
  knex.schema.alterTable('gift_card_templates', table => {
    table
      .integer('max_limit')
      .default(0)
      .notNullable();
    table
      .integer('min_limit')
      .default(0)
      .notNullable();
  });

exports.down = knex =>
  knex.schema.table('gift_card_templates', table => {
    table.dropColumn('max_limit');
    table.dropColumn('min_limit');
  });
