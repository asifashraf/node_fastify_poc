const { transformToCamelCase, getXWeeksAgoFullDate } = require('../../util');

module.exports = async function AutoStockRefresher(queryContext) {
	console.info(`AutoStockRefresher is running....`);
	const weekAgoDate = getXWeeksAgoFullDate(1);
	console.log("Target past date  : ", weekAgoDate);
	let menusHasSoldOutItems = await queryContext.db("brand_locations_unavailable_menu_items")
		.select(queryContext.db.raw("distinct brand_locations_unavailable_menu_items.brand_location_id, menu_sections.menu_id"))
		.join("menu_items", "menu_items.id", "brand_locations_unavailable_menu_items.menu_item_id")
		.join("menu_sections", "menu_items.section_id", "menu_sections.id")
		.where("created_at", ">", weekAgoDate)
		.andWhere({state: "SOLD_OUT"}) || [];
	if (menusHasSoldOutItems.length > 0) {
		menusHasSoldOutItems = transformToCamelCase(menusHasSoldOutItems);
		const pipeline = queryContext.redis.pipeline();
		menusHasSoldOutItems.forEach(({brandLocationId, menuId}) => {
			pipeline.del(`menu:${menuId}:brandLocation:${brandLocationId}`);
		});
		pipeline.exec();
	}
	const deleteResults = await queryContext.db("brand_locations_unavailable_menu_items")
		.where("created_at", ">", weekAgoDate)
		.andWhere({state: "SOLD_OUT"})
		.delete();
	console.log("Delete Results : ", deleteResults);
	console.info(`AutoStockRefresher is finished....`);
}
