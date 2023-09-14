exports.up = function(knex) {
  return knex.schema.table('products', table => {
    table.boolean('cash_on_delivery').defaultTo('false');
  });
};

exports.down = function(knex) {
  return knex.schema.table('products', table => {
    table.dropColumn('cash_on_delivery');
  })
};
