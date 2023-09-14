exports.up = function(knex) {
  return knex.schema.alterTable('brands', table => {
    table.boolean('only_show_subtotal_for_mpos').defaultTo(false).notNullable();
  })
};

exports.down = function(knex) {
  return knex.schema.alterTable('brands', table => {
    table.dropColumn('only_show_subtotal_for_mpos');
  })
};
