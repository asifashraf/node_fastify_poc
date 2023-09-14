exports.up = function (knex) {
  return knex.schema.raw(
    `ALTER TYPE subscription_action_type_enum ADD VALUE IF NOT EXISTS 'ORDER_REFUNDED';`
  )
}

exports.down = async function (knex) {
};
