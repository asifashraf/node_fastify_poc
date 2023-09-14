exports.up = function (knex) {
    return knex.schema.createTable('reward_tier_perks_menu_items', table => {
        table.uuid('id').primary().notNullable();
        table.uuid('reward_tier_perk_id')
            .references('id')
            .inTable('reward_tier_perks')
            .index();
        table.uuid('menu_item_id')
            .references('id')
            .inTable('menu_items')
            .index();
    })
};

exports.down = async function (knex) {
    await knex.schema.dropTable('reward_tier_perks_menu_items');
};
