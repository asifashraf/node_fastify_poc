exports.up = function(knex) {
  return knex.schema.table('gift_card_templates', table => {
    table
      .integer('percent_paid_by_cofe')
      .notNullable()
      .default(0);
    table
      .integer('percent_paid_by_vendor')
      .notNullable()
      .default(100);
  });
};

exports.down = function(knex) {
  return knex.schema.table('gift_card_templates', table => {
    table.dropColumn('percent_paid_by_cofe');
    table.dropColumn('percent_paid_by_vendor');
  });
};
