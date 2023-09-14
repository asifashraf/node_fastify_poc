const { pickupLocationStatus } = require('../../src/schema/root/enums');

exports.up = function (knex) {
    return knex.schema.alterTable('pickup_locations', tableBuilder => {
        tableBuilder.enu('status', Object.values(pickupLocationStatus), {
            useNative: true,
            enumName: 'pickup_location_status_enum',
        })
            .notNullable()
            .defaultTo(pickupLocationStatus.ACTIVE);
    });
};

exports.down = function (knex) {
    return knex.schema.alterTable('pickup_locations', tableBuilder => {
        tableBuilder.dropColumn('status');
    });
};