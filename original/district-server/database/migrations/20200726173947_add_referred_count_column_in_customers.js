exports.up = knex =>
  knex.schema.alterTable('customers', table => {
    table
      .integer('referred_count')
      .defaultsTo(0)
      .nullable();
  });

exports.down = knex =>
  knex.schema.alterTable('customers', table => {
    table.dropColumn('referred_count');
  });
