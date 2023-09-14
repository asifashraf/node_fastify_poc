exports.up = function (knex) {
  return knex.schema.alterTable('filter_sets', (table) => {
    table.dropColumn('empty_data_deeplink_ar');
    table.dropColumn('empty_data_deeplink_tr');
  });
};
exports.down = function (knex) {
  return knex.schema.alterTable('filter_sets', (table) => {
    table.string('empty_data_deeplink_ar').notNullable().defaultTo('');
    table.string('empty_data_deeplink_tr').notNullable().defaultTo('');
  });
};
