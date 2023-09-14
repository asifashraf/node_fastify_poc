exports.up = function (knex) {
    return knex.schema.alterTable('sms_logs', table => {
        table.string("reference_id").index().nullable();
        table.string("message", 1000).nullable();
    });

};
exports.down = function (knex) {
    return knex.schema.alterTable('sms_logs', (table) => {
        table.dropColumn('reference_id');
        table.dropColumn('message');
    });
};
