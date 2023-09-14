exports.up = knex =>
  knex.schema.alterTable('notification_content_email', table => {
    table
      .text('html')
      .notNullable()
      .alter();
    table
      .text('text')
      .notNullable()
      .alter();
  });

exports.down = knex =>
  knex.schema.alterTable('notification_content_email', table => {
    table
      .string('html', 131072)
      .notNullable()
      .alter();
    table
      .string('text', 131072)
      .notNullable()
      .alter();
  });
