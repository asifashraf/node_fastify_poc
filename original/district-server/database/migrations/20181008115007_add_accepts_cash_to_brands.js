exports.up = knex =>
  knex.schema.table('brands', table => {
    table.boolean('accepts_cash').defaultTo(false);
  });

exports.down = knex =>
  knex.schema.table('brands', table => table.dropColumn('accepts_cash'));
