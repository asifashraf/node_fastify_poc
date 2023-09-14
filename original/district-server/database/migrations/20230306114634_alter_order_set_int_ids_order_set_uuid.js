exports.up = function (knex) {
  return knex.schema.raw(
    'ALTER TABLE order_set_int_ids ALTER COLUMN order_set_id TYPE uuid USING order_set_id::uuid'
  )
};

exports.down = function (knex) {
  return knex.schema.alterTable('order_set_int_ids', (table) => {
    table.string('order_set_id', 128).index();
  });
};
