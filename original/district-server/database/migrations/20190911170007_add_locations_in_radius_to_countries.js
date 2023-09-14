exports.up = knex =>
  knex.schema.alterTable('countries', table => {
    table
      .integer('locations_radius')
      .defaultTo(7000)
      .comment('in meters');
  });

exports.down = knex =>
  knex.schema.alterTable('countries', table => {
    table.dropColumn('locations_radius');
  });
