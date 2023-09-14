exports.up = knex =>
  knex.schema.table('customers', table => {
    table
      .datetime('updated_at')
      .notNullable()
      .defaultTo(knex.fn.now());
  });

exports.down = knex =>
  knex.schema.table('customers', table => {
    table.dropColumn('updated_at');
  });
