
exports.up = function (knex) {
	return knex.schema.raw(
		`ALTER TYPE home_page_section_item_type_enum ADD VALUE IF NOT EXISTS 'CATEGORY_ITEM';`
	)
}

exports.down = async function (knex) {
};