
exports.up = function(knex) {
    return knex.schema
        .alterTable('brand_location_devices', table => {
            table.dropColumn('device_serial_id');
            table.string('serial_number', 255).nullable();
            table.string('app_version', 255).nullable();
        });
};

exports.down = function(knex) {
    return knex.schema
        .alterTable('brand_location_devices', table => {
            table.dropColumn('serial_number', 255);
            table.dropColumn('app_version', 255);
        });
};
