exports.up = function (knex) {
  return knex.schema.table('brands', (table) => {
    table.boolean('enable_deliverect').defaultTo(false);
  });
};

exports.down = function (knex) {
  return knex.schema.table('brands', (table) => {
    table.dropColumn('enable_deliverect');
  });
};
