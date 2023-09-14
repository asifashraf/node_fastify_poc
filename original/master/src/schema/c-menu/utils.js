const redis = require('../../../redis');
const { brandLocationMenuKey } = require('../../../redis/keys');

async function invalidateMenuForBrandLocation(brandLocationId) {
  const [{ id: menuId }] = await this.db
    .select('menus.id')
    .from('menus')
    .innerJoin('brands', 'menus.brand_id', 'brands.id')
    .innerJoin('brand_locations', 'brand_locations.brand_id', 'brands.id')
    .innerJoin(
      'brand_location_addresses',
      'brand_location_addresses.brand_location_id',
      'brand_locations.id'
    )
    .innerJoin('cities', 'brand_location_addresses.city_id', 'cities.id')
    .whereRaw(
      'brand_locations.id = ? AND menus.country_id = cities.country_id',
      [brandLocationId]
    );
  const redisKey = brandLocationMenuKey({
    menuId,
    brandLocationId,
  });
  return redis.del(redisKey);
}

const invalidateMenu = menuId => {
  return redis.delKeys(`menu:${menuId}:*`);
};

const invalidateAllMenus = () => {
  return redis.delKeys('menu:*');
};

module.exports = {
  invalidateMenuForBrandLocation,
  invalidateMenu,
  invalidateAllMenus,
};
