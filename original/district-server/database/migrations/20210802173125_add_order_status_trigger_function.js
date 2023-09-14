exports.up = function(knex) {
  return knex.schema.raw(`
  CREATE OR REPLACE FUNCTION public.notify_orderset_status_change()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $function$
  DECLARE
  BEGIN
    UPDATE public.order_sets
    SET current_status = NEW.status::order_set_statuses_enum
    WHERE id = new.order_set_id;
    RETURN NEW;
  END;
  $function$
;
`);
};

exports.down = function(knex) {
  return knex.schema.raw(`DROP FUNCTION IF exists public.notify_orderset_status_change;`);
};
