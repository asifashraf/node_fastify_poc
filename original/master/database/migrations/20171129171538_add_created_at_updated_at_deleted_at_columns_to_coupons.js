exports.up = knex =>
  knex.schema.table('coupons', table => {
    table
      .timestamp('created_at')
      .notNullable()
      .defaultTo(knex.fn.now());
  });

exports.down = knex =>
  knex.schema.table('coupons', table => {
    table.dropColumn('created_at');
  });
