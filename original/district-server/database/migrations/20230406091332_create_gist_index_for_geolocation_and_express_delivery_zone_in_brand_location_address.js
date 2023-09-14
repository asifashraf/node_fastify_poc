exports.up = function(knex) {
  return knex.schema.raw(`
        CREATE INDEX brand_location_addresses_geolocation_idx ON public.brand_location_addresses USING gist(geolocation);
        CREATE INDEX brand_location_addresses_express_delivery_zone_idx ON public.brand_location_addresses USING gist(express_delivery_zone);
    `);
};

exports.down = function(knex) {
  return knex.schema.raw(`
        DROP INDEX brand_location_addresses_geolocation_idx;
        DROP INDEX brand_location_addresses_express_delivery_zone_idx;
    `);
};
