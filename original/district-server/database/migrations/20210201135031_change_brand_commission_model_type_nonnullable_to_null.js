exports.up = knex =>
  knex.schema.alterTable('brand_commission_models', table => {
    table
      .string('type')
      .nullable()
      .alter();
  });

exports.down = knex =>
  knex.schema.alterTable('brand_commission_models', table => {
    table
      .string('type')
      .notNullable()
      .alter();
  });
