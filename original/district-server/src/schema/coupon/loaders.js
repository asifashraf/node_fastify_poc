const DataLoader = require('dataloader');

function createLoaders(model) {
  return {
    countByBrandAndCountry: new DataLoader(async keys => {
      const results = await getCountByBrandAndCountry(model.db, keys);
      const resultMap = new Map();

      results.forEach(result => {
        const key = `${result.brandId}`;
        resultMap.set(key, result.count);
      });

      return keys.map(([brandId, countryId]) => {
        const key = `${brandId}`;
        return resultMap.get(key) || 0;
      });
    }),
  };
}

async function getCountByBrandAndCountry(db, keys) {
  const brandIds = [...new Set(keys.map(([brandId]) => brandId))];
  const countryIds = [...new Set(keys.map(([, countryId]) => countryId).filter(Boolean))];

  const query = db('coupons')
    .select('brands_coupons.brand_id')
    .count('* as count')
    .innerJoin('brands_coupons', 'brands_coupons.coupon_id', 'coupons.id')
    .whereIn('brands_coupons.brand_id', brandIds);

  if (countryIds.length > 0) {
    query.whereIn('coupons.country_id', countryIds);
  }

  query.groupBy('brands_coupons.brand_id');

  return query;
}

module.exports = { createLoaders };
