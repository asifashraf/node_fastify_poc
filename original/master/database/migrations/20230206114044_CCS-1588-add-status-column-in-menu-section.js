exports.up = function (knex) {
  return knex.schema.alterTable('menu_sections', (table) => {
    table.enu('status', ['ACTIVE', 'INACTIVE'], {
      useNative: true,
      enumName: 'menu_sections_status_enum',
    })
    .notNullable()
    .defaultTo('ACTIVE');
  });
};
exports.down = async function (knex) {
  await knex.schema.alterTable('menu_sections', (table) => {
    table.dropColumn('status');
  });
  return knex.schema.raw('DROP TYPE menu_sections_status_enum;');
};