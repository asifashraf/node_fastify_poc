exports.up = knex =>
  knex.schema.table('products', table => {
    table.specificType('compare_at_price', 'numeric(13,3)').alter();
  });

exports.down = knex =>
  knex.schema.alterTable('products', table => {
    table
      .specificType('compare_at_price', 'numeric(13,3)')
      .default(0)
      .alter();
  });
