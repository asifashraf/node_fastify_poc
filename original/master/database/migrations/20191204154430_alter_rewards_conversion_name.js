exports.up = knex =>
  knex.schema.alterTable('rewards', table => {
    table
      .string('conversion_name')
      .default('')
      .alter();
    table
      .string('conversion_name_ar')
      .default('')
      .alter();
  });

exports.down = knex =>
  knex.schema.alterTable('rewards', table => {
    table
      .string('conversion_name')
      .default(null)
      .alter();
    table
      .string('conversion_name_ar')
      .default(null)
      .alter();
  });
