
exports.up = function (knex) {
	return knex.schema.alterTable('home_page_icon_button_items', table => {
		table.integer('span_size')
			.default(1)
			.notNullable();
	})
};
    
exports.down = function (knex) {
	knex.schema.table('home_page_icon_button_items', table => {
    table.dropColumn('span_size');
	});
}
