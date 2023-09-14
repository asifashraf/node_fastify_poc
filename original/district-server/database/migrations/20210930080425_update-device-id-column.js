
exports.up = function(knex) {
    return knex.schema.alterTable('brand_location_devices', table => {
        table.string('device_id', 255).notNullable().alter();
    })
};
  
exports.down = function(knex) {
    return knex.schema.alterTable('brand_location_devices', table => {
        table.string('device_id', 16).notNullable().alter();
    });
};
