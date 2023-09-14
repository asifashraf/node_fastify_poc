exports.up = function (knex) {
  return knex.schema.raw(
    `ALTER TYPE badge_type_enum ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_TYPE_CUP';
     ALTER TYPE badge_type_enum ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_TYPE_BUNDLE';`
  )
}

exports.down = async function (knex) {
};
