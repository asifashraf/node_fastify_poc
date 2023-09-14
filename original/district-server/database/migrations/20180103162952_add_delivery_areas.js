exports.up = knex =>
  knex.schema.table('configuration', table => {
    table
      .string('available_delivery_areas', 4096)
      .default('Salhiya,Kuwait City,Dasman,Sharq,Merqab')
      .notNullable();
  });

exports.down = knex =>
  knex.schema.table('configuration', table => {
    table.dropColumn('available_delivery_areas');
  });
