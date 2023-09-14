exports.up = knex =>
  knex.schema.table('customer_groups', table => {
    table.string('file_url').alter();
  });

exports.down = knex =>
  knex.schema.table('customer_groups', table => {
    table.integer('file_url').alter();
  });
