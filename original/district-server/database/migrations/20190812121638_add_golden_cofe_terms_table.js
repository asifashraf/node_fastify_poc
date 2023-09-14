exports.up = knex =>
  knex.schema.createTable('golden_cofe_terms', table => {
    table.uuid('country_id');
    table.string('term', 1000);
    table.string('term_ar', 1000);
  });

exports.down = knex => knex.schema.dropTable('golden_cofe_terms');
