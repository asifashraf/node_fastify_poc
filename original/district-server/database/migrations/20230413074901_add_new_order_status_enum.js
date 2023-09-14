
exports.up = function(knex) {
  return knex.schema.raw(`
    ALTER TYPE order_set_statuses_enum ADD VALUE IF NOT EXISTS 'DELIVERY_DELAYED';
  `)
};

/**
 * !!!!BE CAREFUL!!!!!
 * current_status field under order_sets is connected this enum,
 * if this enum value will be dropped, current status field must be checked in the order_sets table
 * DELIVERY_DELAYED => OUT_FOR_DELIVERY 
 */

exports.down = function(knex) {
  return knex.schema.raw(`
    DELETE FROM pg_enum
    WHERE enumlabel = 'DELIVERY_DELAYED'
    AND enumtypid = ( SELECT oid FROM pg_type WHERE typname = 'order_set_statuses_enum')
  `)
};
