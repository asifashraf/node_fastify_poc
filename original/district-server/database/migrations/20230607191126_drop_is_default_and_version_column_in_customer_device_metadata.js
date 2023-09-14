exports.up = function (knex) {
  return knex.schema.alterTable('customer_device_metadata', (table) => {
    table.dropColumn('is_default');
    table.dropColumn('version');
    table.dropColumn('status');
  });
};
exports.down = function (knex) {
  return knex.schema.alterTable('customer_device_metadata', (table) => {
    table.boolean('is_default').defaultTo(false).notNullable();
    table.string('version', 16).defaultTo(null);
    table.string('status', 32).notNullable().defaultTo('ACTIVE');
  });
};
