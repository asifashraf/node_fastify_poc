
exports.up = function (knex) {
    return knex.raw(`
    ALTER TYPE sms_log_provider_type_enum ADD VALUE IF NOT EXISTS 'KARIX';
    ALTER TYPE sms_log_provider_type_enum ADD VALUE IF NOT EXISTS 'CEQUENS';
    ALTER TYPE sms_log_provider_type_enum ADD VALUE IF NOT EXISTS 'VICTORY_LINK';
    `);
};

exports.down = function (knex) {
    return knex.raw(`
    
    `)
};
