exports.up = function (knex) {
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
	bla.geolocation,
  COALESCE(ROUND((bls.total_score/bls.total_reviews), 2),0) as rating
FROM
	brand_locations bl
LEFT JOIN brands b ON
	bl.brand_id = b.id
LEFT JOIN brand_location_addresses bla ON
	bla.brand_location_id = bl.id
  LEFT JOIN brand_location_score bls on 
	bl.id = bls.brand_location_id;
      `);
};
exports.down = function (knex) {
  return knex.schema.raw(`
        DROP VIEW public.view_branch_brand;
      `);
};