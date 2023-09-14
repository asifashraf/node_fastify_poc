exports.up = knex =>
  knex.schema.alterTable('customers', table => {
    table
      .boolean('is_disabled')
      .default(false)
      .notNullable();
  });

exports.down = knex =>
  knex.schema.alterTable('customers', table => {
    table.dropColumn('is_disabled');
  });
