exports.up = function (knex) {
    return knex.schema.raw(
        `ALTER TYPE sms_log_provider_type_enum ADD VALUE IF NOT EXISTS 'KARIX';`
    )
}

exports.down = async function (knex) {
};