exports.up = function (knex) {
  return knex.schema.alterTable('tag_schedules', (table) => {
    table.enu('status', ['ACTIVE', 'INACTIVE', 'DELETED'], {
      useNative: true,
      enumName: 'tag_schedules_status_enum',
    });
  });
};
exports.down = function (knex) {
  return knex.schema.alterTable('tag_schedules', (table) => {
    table.dropColumn('status');
  });
};