exports.up = function (knex) {
  return knex.schema.table('brands', (table) => {
    table.boolean('enable_otter').defaultTo(false);
  });
};

exports.down = function (knex) {
  return knex.schema.table('brands', (table) => {
    table.dropColumn('enable_otter');
  });
};
