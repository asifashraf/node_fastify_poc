exports.up = knex =>
  knex.schema.alterTable('brand_locations', table => {
    table
      .boolean('has_delivery')
      .defaultsTo(true)
      .notNullable()
      .alter();
    table
      .boolean('has_pickup')
      .defaultsTo(true)
      .notNullable()
      .alter();
    table
      .boolean('has_catering')
      .defaultsTo(true)
      .notNullable()
      .alter();
  });

exports.down = knex =>
  knex.schema.alterTable('brand_locations', table => {
    table
      .boolean('has_delivery')
      .defaultsTo(null)
      .nullable()
      .alter();
    table
      .boolean('has_pickup')
      .defaultsTo(null)
      .nullable()
      .alter();
    table
      .boolean('has_catering')
      .defaultsTo(null)
      .nullable()
      .alter();
  });
