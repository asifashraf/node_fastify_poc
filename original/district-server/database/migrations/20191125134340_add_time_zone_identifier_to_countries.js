exports.up = knex =>
  knex.schema.alterTable('countries', table => {
    table.string('time_zone_identifier');
  });

exports.down = knex =>
  knex.schema.table('countries', table => {
    table.dropColumn('time_zone_identifier');
  });
