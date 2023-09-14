exports.up = knex =>
  knex.schema.table('order_items', table => {
    table.specificType('perk_discount_multiplier', 'numeric(13, 3)').default(1);
  });

exports.down = knex =>
  knex.schema.table('order_items', table => {
    table.dropColumn('perk_discount_multiplier');
  });
