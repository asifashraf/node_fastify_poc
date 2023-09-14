exports.up = knex =>
  knex.schema.alterTable('user_activity_logs', table => {
    table.text('query').alter();
  });

exports.down = knex =>
  knex.schema.table('user_activity_logs', table => {
    table.string('query').alter();
  });
