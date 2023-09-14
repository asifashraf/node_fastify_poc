exports.up = function(knex) {
  return knex.schema.raw(`
        CREATE OR REPLACE VIEW public.view_orders
        AS SELECT
          os.id,
          os.short_code,
          of2.type as fulfillment_type,
          of2.courier_name,
          os.created_at,
          b.name AS brand_name,
          b.id as brand_id,
          bl.name AS branch_name,
          bl.id as brand_location_id,
          b.country_id,
          os.total,
          os.current_status,
          os.customer_id,
          c.first_name AS customer_first_name,
          c.last_name AS customer_last_name,
          c.email AS customer_email,
          c.phone_number AS customer_phone_number
        FROM order_sets os
        LEFT JOIN order_fulfillment of2 ON os.id = of2.order_set_id
        JOIN brand_locations bl ON os.brand_location_id = bl.id
        JOIN brands b ON bl.brand_id = b.id
        JOIN customers c on os.customer_id = c.id;
      `);
};

exports.down = function(knex) {
  return knex.schema.raw(`
        CREATE OR REPLACE VIEW public.view_orders
        AS SELECT
          os.id,
          os.short_code,
          of2.type as fulfillment_type,
          of2.courier_name,
          os.created_at,
          b.name AS brand_name,
          b.id as brand_id,
          bl.name AS branch_name,
          bl.id as brand_location_id,
          b.country_id,
          os.total,
          os.current_status,
          os.customer_id
        FROM order_sets os
        LEFT JOIN order_fulfillment of2 ON os.id = of2.order_set_id
        LEFT JOIN brand_locations bl ON os.brand_location_id = bl.id
        LEFT JOIN brands b ON bl.brand_id = b.id;
      `);
};
