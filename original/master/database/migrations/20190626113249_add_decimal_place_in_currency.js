exports.up = knex =>
  knex.schema.table('currencies', table => {
    table.integer('decimal_place');
  });

exports.down = knex =>
  knex.schema.table('currencies', table => {
    table.dropColumn('decimal_place');
  });
