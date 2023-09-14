exports.up = knex =>
  knex.schema.table('shipping_policies', table => {
    table
      .string('status', 32)
      .index()
      .notNullable()
      .defaultTo('ACTIVE');
  });

exports.down = knex =>
  knex.schema.alterTable('shipping_policies', table => {
    table.dropColumn('status');
  });
