exports.up = knex =>
  knex.schema.alterTable('banks', table => {
    table
      .string('identifier')
      .nullable()
      .alter();
  });

exports.down = knex =>
  knex.schema.alterTable('banks', table => {
    table
      .string('identifier')
      .notNullable()
      .alter();
  });
