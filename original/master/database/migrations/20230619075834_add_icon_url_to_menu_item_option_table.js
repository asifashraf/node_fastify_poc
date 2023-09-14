
exports.up = function (knex) {
	return knex.schema.alterTable('menu_item_options', table => {
		table.string('icon_url');
        table.string('icon_url_ar');
        table.string('icon_url_tr');
	})
};
    
exports.down = function (knex) {
	knex.schema.table('menu_item_options', table => {
        table.dropColumn('icon_url');
        table.dropColumn('icon_url_ar');
        table.dropColumn('icon_url_tr');
	});
}
