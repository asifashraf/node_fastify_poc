exports.up = async function (knex, Promise) {
    await knex.schema.alterTable('sms_logs', (table) => {
        table.dropColumn('operation_type');
    });
    await knex.schema.alterTable('sms_logs', (table) => {
        table.enu('operation_type', ['DRIVER', 'ECOM'], {
            useNative: true,
            enumName: 'sms_logs_operation_type_enum',
        }).defaultTo('DRIVER');
    });
};
exports.down = async function (knex, Promise) {
    await knex.schema.alterTable('sms_logs', (table) => {
        table.dropColumn('operation_type');
    });
    await knex.schema.alterTable('<table name>', (table) => {
        table.enu('operation_type', ['DRIVER'], {
            useNative: true,
            enumName: 'sms_logs_operation_type_enum',
        }).defaultTo('DRIVER');
    });
}