exports.up = knex =>
  knex.schema.table('order_sets', table => {
    table
      .string('src', 60)
      .notNullable()
      .default('MOBILE');
  });

exports.down = knex =>
  knex.schema.table('order_sets', table => {
    table.dropColumn('src').notNullable();
  });
