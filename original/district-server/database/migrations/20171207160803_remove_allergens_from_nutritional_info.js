exports.up = knex =>
  knex.schema.table('nutritional_info', table => {
    table.dropColumn('allergens');
  });

exports.down = knex =>
  knex.schema.table('nutritional_info', table => {
    table.string('allergens');
  });
