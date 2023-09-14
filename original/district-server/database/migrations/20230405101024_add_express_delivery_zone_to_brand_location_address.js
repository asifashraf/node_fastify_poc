exports.up = function(knex) {
  return knex.schema.table('brand_location_addresses', function(table) {
    table.specificType('express_delivery_zone', 'geometry(MultiPolygon, 4326)').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.table('brand_location_addresses', function(table) {
    table.dropColumn('express_delivery_zone');
  });
};
