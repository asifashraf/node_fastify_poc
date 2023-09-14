exports.up = knex =>
  knex.schema.table('customer_groups', table => {
    table.integer('file_url');
  });

exports.down = knex =>
  knex.schema.table('customer_groups', table => {
    table.dropColumn('file_url');
  });
