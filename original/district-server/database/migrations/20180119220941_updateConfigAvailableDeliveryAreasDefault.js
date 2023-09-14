exports.up = knex =>
  knex.schema.table('configuration', table => {
    table
      .string('available_delivery_areas', 4096)
      .default('Kuwait City, Dasman, Sharq, Jibla, Mirqab')
      .notNullable()
      .alter();
  });

exports.down = knex =>
  knex.schema.table('configuration', table => {
    table
      .string('available_delivery_areas', 4096)
      .default('Salhiya,Kuwait City,Dasman,Sharq,Merqab')
      .notNullable()
      .alter();
  });
