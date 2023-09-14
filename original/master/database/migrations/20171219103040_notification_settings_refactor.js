exports.up = knex =>
  knex.schema
    .table('customers', table => {
      table
        .boolean('sms_delivery_updates')
        .default(true)
        .notNullable();
      table
        .boolean('sms_pickup_updates')
        .default(true)
        .notNullable();
      table
        .boolean('push_delivery_updates')
        .default(true)
        .notNullable();
      table
        .boolean('push_pickup_updates')
        .default(true)
        .notNullable();
      table
        .boolean('new_offers')
        .default(true)
        .notNullable();
    })
    .dropTable('notification_settings');

exports.down = knex =>
  knex.schema
    .createTable('notification_settings', table => {
      table.uuid('id').primary();
      table.boolean('sms_order_confirmed').notNullable();
      table.boolean('pn_order_confirmed').notNullable();
      table
        .string('customer_id')
        .references('id')
        .inTable('customers')
        .index()
        .notNullable();
    })
    .table('customers', table => {
      table.dropColumn('sms_delivery_updates');
      table.dropColumn('sms_pickup_updates');
      table.dropColumn('push_delivery_updates');
      table.dropColumn('push_pickup_updates');
      table.dropColumn('new_offers');
    });
