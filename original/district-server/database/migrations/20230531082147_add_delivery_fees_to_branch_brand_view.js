exports.up = function(knex) {
  return knex.schema.raw(`
    DROP VIEW IF EXISTS public.view_branch_brand;

    CREATE OR REPLACE
    VIEW public.view_branch_brand
    AS
    SELECT
      bl.*,
      b.name as brand_name,
      b.country_id,
      b.brand_description as brand_description,
      b.brand_description_ar as brand_description_ar,
      b.brand_description_tr as brand_description_tr,
      b.delivery_fee,
      b.express_delivery_fee,
      bla.geolocation,
      bls.total_score,
      bls.total_reviews
    FROM
      brand_locations bl
    LEFT JOIN brands b ON
      bl.brand_id = b.id
    LEFT JOIN brand_location_addresses bla ON
      bla.brand_location_id = bl.id
    LEFT JOIN brand_location_score bls ON
      bls.brand_location_id = bl.id;
  `);
};

exports.down = function(knex) {
  return knex.schema.raw(`
    DROP VIEW IF EXISTS public.view_branch_brand;

    CREATE OR REPLACE
    VIEW public.view_branch_brand
    AS
    SELECT
      bl.*,
      b.name as brand_name,
      b.country_id,
      b.brand_description as brand_description,
      b.brand_description_ar as brand_description_ar,
      b.brand_description_tr as brand_description_tr,
      bla.geolocation
    FROM
      brand_locations bl
    LEFT JOIN brands b ON
      bl.brand_id = b.id
    LEFT JOIN brand_location_addresses bla ON
      bla.brand_location_id = bl.id;
  `);
};
