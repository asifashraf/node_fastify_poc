exports.up = knex =>
  knex.schema.table('notification_content_email', table => {
    table.dropColumn('content_type');
    table.dropColumn('content');
    table.string('html', 131072).notNullable();
    table.string('plaintext', 131072).notNullable();
  });

exports.down = knex =>
  knex.schema.table('notification_content_email', table => {
    table.string('content_type').notNullable(); // 'email' or 'plaintext'
    table.string('content', 4096).notNullable();
    table.dropColumn('html');
    table.dropColumn('plaintext');
  });
