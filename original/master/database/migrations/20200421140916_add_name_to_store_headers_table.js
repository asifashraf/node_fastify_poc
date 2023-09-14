exports.up = knex =>
  knex.schema.table('store_headers', table => {
    table.string('name');
  });

exports.down = knex =>
  knex.schema.alterTable('store_headers', table => {
    table.dropColumn('name');
  });
