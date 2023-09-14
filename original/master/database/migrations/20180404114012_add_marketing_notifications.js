exports.up = knex =>
  knex.schema
    .createTable('marketing_notifications', table => {
      table.uuid('id').primary();
      table.string('short_code').notNullable();
      table.string('message').notNullable();
      table.string('title').notNullable();
      table.boolean('target_all').notNullable();
      table.boolean('target_ios').notNullable();
      table.boolean('target_android').notNullable();
      table
        .uuid('notification_id')
        .references('id')
        .inTable('notifications')
        .notNullable()
        .onDelete('CASCADE');
    })
    .table('notifications', table => {
      table
        .string('customer_id')
        .nullable()
        .alter();
    })
    .table('notification_content_email', table => {
      table.dropForeign('notification_id');
      table
        .foreign('notification_id')
        .references('id')
        .inTable('notifications')
        .onDelete('CASCADE');
    })
    .table('notification_content_push', table => {
      table.dropForeign('notification_id');
      table
        .foreign('notification_id')
        .references('id')
        .inTable('notifications')
        .onDelete('CASCADE');
    })
    .table('notification_content_sms', table => {
      table.dropForeign('notification_id');
      table
        .foreign('notification_id')
        .references('id')
        .inTable('notifications')
        .onDelete('CASCADE');
    });

exports.down = knex => knex.schema.dropTable('marketing_notifications');
