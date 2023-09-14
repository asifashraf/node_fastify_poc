

exports.up = async function (knex) {
	const homePageSectionSettings = await knex.select('*').from('home_page_section_settings');
	await knex.schema.alterTable('home_page_sections', (table) => {
		table.uuid('country_id')
			.references('id')
			.inTable('countries')
			.index();
		table.integer('sort_order');
		table.boolean('is_must')
			.notNullable()
			.defaultTo(false);
		table.boolean('is_auth_required')
			.notNullable()
			.defaultTo(false);
		table.boolean('is_location_based')
			.notNullable()
			.defaultTo(false);
		table.boolean('is_paginated')
			.notNullable()
			.defaultTo(false);
		table.integer('per_page');
		table.integer('offset');
		table.boolean('has_express_zone_check')
			.notNullable()
			.defaultTo(false); 
		table.string('view_all_deeplink')
			.nullable();
		table.string('background_color')
			.nullable();
	});
	const updateList = homePageSectionSettings.map(settings => {
		return knex('home_page_sections')
			.where('id', settings.sectionId)
			.update({
				country_id: settings.countryId,
				sort_order: settings.sortOrder,
				is_must: settings.isMust,
				is_auth_required: settings.isAuthRequired,
				is_location_based: settings.isLocationBased,
				is_paginated: settings.isPaginated,
				per_page: settings.perPage
			});
	})
	return Promise.all(updateList);
};

exports.down = function (knex) {
	return knex.schema.alterTable('home_page_sections', (table) => {
		table.dropColumn('country_id');
		table.dropColumn('sort_order');
		table.dropColumn('is_must');
		table.dropColumn('is_auth_required');
		table.dropColumn('is_location_based');
		table.dropColumn('is_paginated');
		table.dropColumn('per_page');
		table.dropColumn('offset');
		table.dropColumn('has_express_zone_check');
		table.dropColumn('view_all_deeplink');
		table.dropColumn('background_color');
	});
};
