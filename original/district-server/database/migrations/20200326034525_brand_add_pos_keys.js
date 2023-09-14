exports.up = knex =>
  knex.schema.alterTable('brands', table => {
    table.string('pos_url');
    table.string('pos_key');
    table.string('pos_secret');
  });

exports.down = knex =>
  knex.schema.table('brands', table => {
    table.dropColumn('pos_url');
    table.dropColumn('pos_key');
    table.dropColumn('pos_secret');
  });
