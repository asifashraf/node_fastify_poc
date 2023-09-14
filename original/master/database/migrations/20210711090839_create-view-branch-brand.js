exports.up = function(knex) {
  return knex.schema.raw(`
    CREATE OR REPLACE VIEW public.view_branch_brand
    AS SELECT
      bl.*,
      b.name AS brand_name,
      b.country_id,
      bla.geolocation
    FROM brand_locations bl
    LEFT JOIN brands b ON bl.brand_id = b.id
    LEFT JOIN brand_location_addresses bla ON bla.brand_location_id = bl.id;
      `);
};

exports.down = function(knex) {
  return knex.schema.raw(`
        DROP VIEW public.view_branch_brand;
      `);
};
