exports.up = knex =>
  knex.schema.table('customers', table => {
    table
      .boolean('is_phone_verified')
      .notNullable()
      .default(false);
    table.string('phone_country');
    table.renameColumn('phone', 'phone_number');
  });

exports.down = knex =>
  knex.schema.table('customers', table => {
    table.dropColumn('is_phone_verified');
    table.dropColumn('phone_country');
    table.renameColumn('phone_number', 'phone');
  });
