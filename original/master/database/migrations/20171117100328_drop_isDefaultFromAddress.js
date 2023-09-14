exports.up = knex =>
  knex.schema.table('addresses', table => {
    table.dropColumn('is_default');
  });

exports.down = knex =>
  knex.schema.table('addresses', table => {
    table
      .boolean('is_default')
      .default(false)
      .notNullable();
  });
