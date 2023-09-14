exports.up = knex =>
  knex.schema.createTable('customers', table => {
    table.string('id').primary();
    table.string('first_name').notNullable();
    table.string('last_name').notNullable();
    table.string('phone').notNullable();
    table
      .string('email', 320)
      .notNullable()
      .index();
  });

exports.down = knex => knex.schema.dropTable('customers');
