const { onUpdateTrigger } = require('../../knexfile.js');

exports.up = function (knex) {
    return knex.schema.createTable('sms_logs', table => {
        table.uuid('id').primary().notNullable();
        table.enu('provider_type', ['UNIFONIC'], {
            useNative: true,
            enumName: 'sms_log_provider_type_enum',
        }).notNullable();
        table.enu('status', ['SENT', 'FAILED'], {
            useNative: true,
            enumName: 'sms_log_status_enum',
        }).notNullable();
        table.string('phone_number', 140).notNullable();
        table.string('phone_country').notNullable();
        table.enu('operation_type', ['DRIVER'], {
            useNative: true,
            enumName: 'sms_log_soperation_type_enum',
        }).notNullable();
        table
            .timestamp('created')
            .notNullable()
            .defaultTo(knex.fn.now());
        table
            .timestamp('updated')
            .notNullable()
            .defaultTo(knex.fn.now());
    }).then(() => knex.raw(onUpdateTrigger('sms_logs')));
};

exports.down = async function (knex) {
    await knex.schema.dropTable('sms_logs');
};
