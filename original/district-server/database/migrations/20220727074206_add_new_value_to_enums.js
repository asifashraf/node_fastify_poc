exports.up = function (knex) {
    return knex.schema.raw(
        `ALTER TYPE subscription_status_enum ADD VALUE IF NOT EXISTS 'DELETED';
        ALTER TYPE subscription_brand_status_enum ADD VALUE IF NOT EXISTS 'DELETED';`
    )
}

exports.down = async function (knex) {
};