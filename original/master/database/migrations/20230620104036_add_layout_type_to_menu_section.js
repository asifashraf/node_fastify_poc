const { menuSectionLayoutType } = require('../../src/schema/menu-section/enums');

exports.up = function (knex) {
	return knex.schema.alterTable('menu_sections', table => {
		table.enu('layout_type', Object.values(menuSectionLayoutType), {
			useNative: true,
			enumName: 'menu_sections_layout_type_enum',
		})
		.defaultTo('LIST_DISPLAY')
		.notNullable();
	})
};
    
exports.down = function (knex) {
	knex.schema.table('menu_sections', table => {
    table.dropColumn('layout_type');
	});
}
