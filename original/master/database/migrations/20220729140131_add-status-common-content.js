const { onUpdateTrigger } = require('../../knexfile');

exports.up = function(knex) {
  return knex.schema.alterTable('common_content', table => {
    table.enu('status', ['ACTIVE','INACTIVE','DELETED'], {
      useNative: true,
      enumName: 'common_content_status_enum'
    })
    .defaultTo('ACTIVE');
  }).then(() => knex.raw(onUpdateTrigger('common_content')));
};

exports.down = function(knex)   {
  return knex.schema.alterTable('common_content', table => {
    table.dropColumn('status');
  }).raw('DROP TYPE common_content_status_enum')
  .raw('DROP TRIGGER common_content_on_update_timestamp ON common_content')
};
