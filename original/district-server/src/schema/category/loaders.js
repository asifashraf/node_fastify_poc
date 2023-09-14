const DataLoader = require('dataloader');
const { map, filter, findIndex } = require('lodash');
const { addLocalizationField } = require('../../lib/util');

function createLoaders(model) {
  return {
    countries: new DataLoader(async categoryIds => {
      const allCategoryStatuses = await model.db
        .table('categories as c')
        .select(
          model.db.raw(
            '(CASE WHEN ccTemp.count is NULL THEN true ELSE false END) as all_country, c.id'
          )
        )
        .joinRaw(`LEFT JOIN (SELECT count(*), category_id from categories_countries GROUP BY category_id) as ccTemp 
        ON ccTemp.category_id = c.id`)
        .whereIn('c.id', categoryIds);

      const allCountry = addLocalizationField(await model.db.table('countries')
        .select(
          model.db.raw(
            'id as country_id, name, name_ar, name_tr'
          )
        ), 'name');

      const categoryWithSpecificCountry = addLocalizationField(await model.db.table('countries as c')
        .select(
          model.db.raw(
            'c.id as country_id, c.name, c.name_ar, c.name_tr, cc.category_id'
          )
        )
        .leftJoin(
          'categories_countries as cc',
          'cc.country_id',
          'c.id'
        )
        .whereIn('cc.category_id',
          allCategoryStatuses.map(elem => {
            if (!elem.allCountry) return elem.id;
          }).filter(n => n)),
      'name');
      return map(categoryIds, categoryId =>
        (findIndex(allCategoryStatuses, a => a.id === categoryId && a.allCountry === true) < 0 ? filter(categoryWithSpecificCountry, a => a.categoryId === categoryId) : allCountry)
      );
    }),
  };
}
module.exports = { createLoaders };
