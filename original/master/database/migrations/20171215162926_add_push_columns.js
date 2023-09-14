exports.up = knex =>
  knex.schema.table('push_device_tokens', table => {
    table.renameColumn('customer_id', 'user_id');
    table
      .boolean('is_sandbox')
      .notNullable()
      .default(false);
    table
      .string('app_name')
      .notNullable()
      .default('cofe_district');
  });

exports.down = knex =>
  knex.schema.table('push_device_tokens', table => {
    table.dropColumn('is_sandbox');
    table.dropColumn('app_name');
    table.renameColumn('user_id', 'customer_id');
  });
