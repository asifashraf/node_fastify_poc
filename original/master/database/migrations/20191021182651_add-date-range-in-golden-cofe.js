exports.up = knex =>
  knex.schema.alterTable('golden_cofe_terms', table => {
    table.date('start_date');
    table.date('end_date');
  });

exports.down = knex =>
  knex.schema.table('golden_cofe_terms', table => {
    table.dropColumn('start_date');
    table.dropColumn('end_date');
  });
