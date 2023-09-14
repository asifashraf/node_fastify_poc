exports.up = function(knex) {
  return knex.schema.table('products', table => {
    table.string('hs_code')
    table.string('origin_country')
    table.string('best_for')
    table.string('roast_level')
    table.timestamp('roast_date')
    table.string('roast_region')
    table.text('process')
    table.string('region_or_farm')
    table.text('taste_notes')
    table.string('altitude')
    table.string('varietal')
  });
};

exports.down = function(knex) {
  return knex.schema.table('products', table => {
    table.dropColumn('hs_code');
    table.dropColumn('origin_country')
    table.dropColumn('best_for')
    table.dropColumn('roast_level')
    table.dropColumn('roast_date')
    table.dropColumn('roast_region')
    table.dropColumn('process')
    table.dropColumn('region_or_farm')
    table.dropColumn('taste_notes')
    table.dropColumn('altitude')
    table.dropColumn('varietal')
  })
};