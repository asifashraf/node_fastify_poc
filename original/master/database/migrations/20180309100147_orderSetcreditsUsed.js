exports.up = knex =>
  knex.schema.alterTable('order_sets', table => {
    table
      .boolean('credits_used')
      .notNullable()
      .default(false);
  });

exports.down = knex =>
  knex.schema.alterTable('order_sets', table => {
    table.dropColumn('credits_used');
  });
