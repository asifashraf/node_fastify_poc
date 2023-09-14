
exports.up = function (knex) {
	return knex.schema.createTable('stamp_reward_eligible_items', (table) => {
		table.uuid('id')
			.primary()
			.notNullable();
		table.uuid('item_id')
			.references('id')
			.inTable('menu_items')
			.index()
			.unique()
			.notNullable();
		});
};

exports.down = function (knex) {
	return knex.schema.dropTable('stamp_reward_eligible_items');
};