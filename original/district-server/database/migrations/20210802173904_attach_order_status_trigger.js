exports.up = function(knex) {
  return knex.schema.raw(`
  CREATE TRIGGER trg_order_status_changed
      AFTER INSERT
      ON public.order_set_statuses
      FOR EACH ROW
      EXECUTE PROCEDURE notify_orderset_status_change();`);
};

exports.down = function(knex) {
  return knex.schema.raw(`
          DROP TRIGGER IF EXISTS trg_order_status_changed ON public.order_set_statuses;
        `);
};
