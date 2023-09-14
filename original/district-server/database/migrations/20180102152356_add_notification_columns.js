exports.up = knex =>
  knex.schema
    .table('notification_content_email', table => {
      table.string('subject', 1024).notNullable();
      table.string('sender').notNullable();
      table.renameColumn('plaintext', 'text');
    })
    .table('customers', table => {
      table
        .string('phone_country')
        .notNullable()
        .alter();
    });

exports.down = knex =>
  knex.schema
    .table('notification_content_email', table => {
      table.dropColumn('subject');
      table.dropColumn('sender');
      table.renameColumn('text', 'plaintext');
    })
    .table('customers', table => {
      table.string('phone_country').alter();
    });
