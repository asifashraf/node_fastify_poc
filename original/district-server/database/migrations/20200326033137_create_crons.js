exports.up = knex =>
  knex.schema.createTable('crons', table => {
    table.uuid('id').primary();
    table.string('type');
    table.timestamp('last_sync');
    table.string('last_status');
    table.text('last_error');
  });

exports.down = knex => knex.schema.dropTable('crons');
