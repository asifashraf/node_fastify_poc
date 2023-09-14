exports.up = knex =>
  knex.schema.table('customers', table => {
    table.string('password').defaultTo(null);
    table
      .datetime('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());
  });

exports.down = knex =>
  knex.schema.table('customers', table => {
    table.dropColumn('password');
    table.dropColumn('created_at');
  });
