exports.up = function(knex) {
  return knex.schema.alterTable('drivers', table => {
    table.string('preferred_language').defaultTo('en');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('drivers', table => {
    table.dropColumn('preferred_language');
  });
};
