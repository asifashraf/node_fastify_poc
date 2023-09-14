exports.up = knex =>
  knex.schema.table('configuration', table => {
    table.integer('premium_services_radius').defaultTo(500);
  });

exports.down = knex =>
  knex.schema.table('configuration', table => {
    table.dropColumn('premium_services_radius');
  });
