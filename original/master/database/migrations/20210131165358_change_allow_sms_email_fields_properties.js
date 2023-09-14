exports.up = knex => {
  return knex.schema.table('customers', table => {
    table.dropColumn('allow_sms');
    table.dropColumn('allow_email');
  }).then(() => {
    return knex.schema.table('customers', table => {
      table
        .boolean('allow_sms')
        .default(true)
        .notNullable();
      table
        .boolean('allow_email')
        .default(true)
        .notNullable();
    });
  })
}

exports.down = knex => {
  return knex.schema.table('customers', table => {
    table.dropColumn('allow_sms');
    table.dropColumn('allow_email');
  }).then(() => {
    return knex.schema.table('customers', table => {
      table.boolean('allow_sms').nullable();
      table.boolean('allow_email').nullable();
    });
  });
};
