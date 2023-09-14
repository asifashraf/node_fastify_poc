exports.up = function(knex) {
  return knex.schema.alterTable('otp_available_countries', table => {
    table.boolean('is_adjust_device_checker_enabled').defaultTo(true).notNullable();
  })

};

exports.down = function(knex) {
  return knex.schema.alterTable('otp_available_countries', table => {
    table.dropColumn('is_adjust_device_checker_enabled');
  })
};
