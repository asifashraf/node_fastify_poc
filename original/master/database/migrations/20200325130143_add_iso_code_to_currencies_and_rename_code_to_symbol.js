exports.up = knex =>
  knex.schema.table('currencies', table => {
    table.string('iso_code', 3).index();
    table.renameColumn('code', 'symbol');
    table.renameColumn('code_ar', 'symbol_ar');
  });

exports.down = knex =>
  knex.schema.alterTable('currencies', table => {
    table.dropColumn('iso_code');
    table.renameColumn('symbol', 'code');
    table.renameColumn('symbol_ar', 'code_ar');
  });
