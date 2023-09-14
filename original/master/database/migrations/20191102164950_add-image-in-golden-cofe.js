exports.up = knex =>
  knex.schema.alterTable('golden_cofe_terms', table => {
    table.string('image_url');
    table.string('image_url_ar');
  });

exports.down = knex =>
  knex.schema.table('golden_cofe_terms', table => {
    table.dropColumn('image_url');
    table.dropColumn('image_url_ar');
  });
