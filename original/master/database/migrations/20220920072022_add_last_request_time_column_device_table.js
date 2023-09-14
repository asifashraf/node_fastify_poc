
exports.up = knex =>
    knex.schema.table('brand_location_devices', table => {
        table.timestamp('last_request_time').nullable();
    });

exports.down = knex =>
    knex.schema.table('brand_location_devices', table => {
        table.dropColumn('last_request_time');
    });
