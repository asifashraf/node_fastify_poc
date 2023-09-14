exports.up = knex =>
  knex.schema
    .createTable('push_device_tokens', table => {
      table.uuid('id').primary();
      table.string('device_token').notNullable();
      table.string('service').notNullable(); // 'apns' or 'gcm'
      table.string('aws_sns_endpoint_arn');
      table
        .string('customer_id')
        .references('id')
        .inTable('customers')
        .notNullable();
    })
    .createTable('notifications', table => {
      table.uuid('id').primary();
      table.datetime('date_created').notNullable();
      table
        .string('customer_id')
        .references('id')
        .inTable('customers')
        .notNullable();

      // 'push', 'sms', or 'email'
      table.string('medium').notNullable();

      // don't send before this date
      table.datetime('embargo_date');

      // 'pending', 'delivered', 'active', 'failed', or 'unknown',
      table
        .string('status')
        .notNullable()
        .default('pending');

      // The number of times we have attempted to send the message.
      table
        .integer('number_of_attempts')
        .notNullable()
        .default(0);

      // When the most recent attempt finished (whether successful or not)
      table.datetime('date_of_most_recent_attempt');
    })
    .createTable('notification_content_push', table => {
      table.uuid('id').primary();
      table.json('apns').notNullable(); // payload formatted for APNS
      table.json('gcm'); // payload formatted for GCM
      table
        .uuid('notification_id')
        .references('id')
        .inTable('notifications');
    })
    .createTable('notification_content_sms', table => {
      table.uuid('id').primary();
      table.string('text', 1600).notNullable();
      table
        .uuid('notification_id')
        .references('id')
        .inTable('notifications');
    })
    .createTable('notification_content_email', table => {
      table.uuid('id').primary();
      table.string('content_type').notNullable(); // 'email' or 'plaintext'
      table.string('content', 4096).notNullable();
      table
        .uuid('notification_id')
        .references('id')
        .inTable('notifications');
    });

exports.down = knex =>
  knex.schema
    .dropTable('push_device_tokens')
    .dropTable('notification_content_push')
    .dropTable('notification_content_sms')
    .dropTable('notification_content_email')
    .dropTable('notifications');
