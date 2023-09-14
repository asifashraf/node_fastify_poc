exports.up = knex =>
  knex.schema.table('customers', table => {
    table
      .string('phone_number')
      .nullable()
      .alter();
    table
      .string('phone_country')
      .nullable()
      .alter();
  });

exports.down = knex =>
  knex.schema.table('customers', table => {
    table
      .string('phone_number')
      .notNullable()
      .defaultTo('')
      .alter();
    table
      .string('phone_country')
      .notNullable()
      .defaultTo('')
      .alter();
  });
