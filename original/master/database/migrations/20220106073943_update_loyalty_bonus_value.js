exports.up = function(knex) {
    return knex.schema.alterTable('loyalty_bonuses', table => {
        table.specificType('value', 'numeric(13, 3)').default(0).notNullable().alter();
    })
};
  
exports.down = function(knex) {
    return knex.schema.alterTable('loyalty_bonuses', table => {
        table.integer('value').defaultTo(0).notNullable().alter();
    });
};