exports.up = knex =>
  knex.schema.table('nutritional_info', table => {
    table.integer('sugar');
    table.integer('protein');
  });

exports.down = knex =>
  knex.schema.table('nutritional_info', table => {
    table.dropColumn('sugar');
    table.dropColumn('protein');
  });
