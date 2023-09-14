exports.up = knex =>
  knex.schema.table('notification_settings', table => {
    table
      .string('customer_id')
      .references('id')
      .inTable('customers')
      .index()
      .notNullable();
  });

exports.down = knex =>
  knex.schema.table('notification_settings', table => {
    table.dropColumn('customer_id');
  });
