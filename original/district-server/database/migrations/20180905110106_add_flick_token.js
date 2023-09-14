exports.up = knex =>
  knex.schema.createTable('flick_token', table => {
    table.uuid('id').primary();
    table.text('partner_token');
  });

exports.down = knex => knex.schema.dropTable('flick_token');
