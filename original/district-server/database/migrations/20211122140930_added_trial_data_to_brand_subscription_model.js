
exports.up = function(knex) {
    return knex.schema.table('brand_subscription_model', table => {
        table.boolean('has_trial').defaultTo(false);
        table.timestamp('trial_start_date');
        table.timestamp('trial_end_date');
    })
};
  
exports.down = function(knex) {
    return knex.schema.table('brand_subscription_model', table => {
        table.dropColumn('has_trial');
        table.dropColumn('trial_start_date');
        table.dropColumn('trial_end_date');
    });
};
