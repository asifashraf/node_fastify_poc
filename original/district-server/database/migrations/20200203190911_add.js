exports.up = knex =>
  knex.schema.alterTable('notification_content_email', table => {
    table.string('receiver_email');
    table.string('receiver_name');
  });

exports.down = knex =>
  knex.schema.table('notification_content_email', table => {
    table.dropColumn('receiver_email');
    table.dropColumn('receiver_name');
  });
