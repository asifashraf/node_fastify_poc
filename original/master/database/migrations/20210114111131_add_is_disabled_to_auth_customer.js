exports.up = knex => {
  return Promise.all([
    knex.schema.alterTable('customers', table => {
      table.dropColumn('is_disabled');
    }),
    knex.schema.alterTable('auth_customer', table => {
      table
        .boolean('is_disabled')
        .default(false)
        .notNullable();
    }),
  ]);
};

exports.down = knex => {
  return Promise.all([
    knex.schema.alterTable('customers', table => {
      table
        .boolean('is_disabled')
        .default(false)
        .notNullable();
    }),
    knex.schema.alterTable('auth_customer', table => {
      table.dropColumn('is_disabled');
    }),
  ]);
};
