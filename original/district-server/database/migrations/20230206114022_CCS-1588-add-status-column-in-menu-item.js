exports.up = function (knex) {
  return knex.schema.alterTable('menu_items', (table) => {
    table.enu('status', ['ACTIVE', 'INACTIVE'], {
      useNative: true,
      enumName: 'menu_items_status_enum',
    })
    .notNullable()
    .defaultTo('ACTIVE');
  });
};
exports.down = async function (knex) {
  await knex.schema.alterTable('menu_items', (table) => {
    table.dropColumn('status');
  });
  return knex.schema.raw('DROP TYPE menu_items_status_enum;');

};
