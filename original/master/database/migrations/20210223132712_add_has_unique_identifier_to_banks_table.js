exports.up = knex =>
  knex.schema.alterTable('banks', table => {
    table
      .boolean('has_unique_identifier')
      .default(false)
      .notNullable();
  });

exports.down = knex =>
  knex.schema.alterTable('banks', table => {
    table.dropColumn('has_unique_identifier');
  });
