exports.up = function(knex) {
  return knex.schema.table('configuration', table =>
    table.string('default_country_id').nullable()
  );
};

exports.down = function(knex) {
  return knex.schema.table('configuration', table =>
    table.dropColumn('default_country_id')
  );
};
