exports.up = knex =>
  knex.schema.createTable('notification_settings', table => {
    table.uuid('id').primary();
    table.boolean('sms_order_confirmed').notNullable();
    table.boolean('pn_order_confirmed').notNullable();
  });

exports.down = knex => knex.schema.dropTable('notification_settings');
