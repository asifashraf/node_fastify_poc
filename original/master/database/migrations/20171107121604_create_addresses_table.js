exports.up = knex =>
  knex.schema.createTable('addresses', table => {
    table.uuid('id').primary();
    table.string('address1').notNullable();
    table.string('address2');
    table.string('city').notNullable();
    table.string('province').notNullable();
    table.string('country').notNullable();
    table.string('zip').notNullable();
    table.float('longitude').notNullable();
    table.float('latitude').notNullable();
    table
      .boolean('is_default')
      .default(false)
      .notNullable();
  });

exports.down = knex => knex.schema.dropTable('addresses');
