exports.up = function(knex) {
  return knex.schema.raw(`
      CREATE OR REPLACE VIEW public.view_brand_locations
      AS SELECT
      bl.id,
      bl.brand_id,
      bl.name,
      bl.name_ar,
      bl.name_tr,
      bl.delivery_radius,
      bl.express_delivery_radius,
      bl.accepting_orders,
      bl.status brand_location_status,
      bl.allow_deliver_to_car,
      bla.geolocation,
      b.name brand_name,
      b.name_ar brand_name_ar,
      b.name_tr brand_name_tr,
      b.status brand_status,
      b.country_id,
      b.favicon
  FROM
      brands b
      LEFT JOIN brand_locations bl ON bl.brand_id = b.id
      LEFT JOIN brand_location_addresses bla ON bla.brand_location_id = bl.id
    `);
};

exports.down = function(knex) {
  return knex.schema.raw(`
      DROP VIEW public.view_brand_locations;
    `);
};
