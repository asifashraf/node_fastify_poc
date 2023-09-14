/* eslint-disable camelcase */

const BaseModel = require('../../base-model');
const { addLocalizationField } = require('../../lib/util');


class CommonContent extends BaseModel {

  constructor(db, context) {

    super(db, 'common_content', context);

  }

  update(commonContent) {
    return super.save(commonContent);
  }

  getQueryByFilters(filters) {
    const query = this.db(this.tableName).orderBy('order', 'acs');
    Object.entries(filters).map(([key, val]) => {
      if (Array.isArray(val) && val.length) {
        query.whereIn(key, val);
      } else if (val) {
        query.andWhere(key, val);
      }
    });
    return query;
  }

  async getByFilters(filters) {
    let contentItems = await this.getQueryByFilters(filters);
    contentItems = addLocalizationField(contentItems, 'title');
    contentItems = addLocalizationField(contentItems, 'subtitle');
    contentItems = addLocalizationField(contentItems, 'description');
    return contentItems;
  }

  async getById(id) {
    let contentItem = await this.getQueryByFilters({ id }).first();
    contentItem = addLocalizationField(contentItem, 'title');
    contentItem = addLocalizationField(contentItem, 'subtitle');
    contentItem = addLocalizationField(contentItem, 'description');
    return contentItem;
  }

  getReplacedString(localizedObj, totalCupsCount, discountPrice, discountPercentage, name, period, price, currency) {
    const langsX = ['en', 'ar', 'tr'];
    const localizeStr = (val) => {
      if (localizedObj[val]) {
        localizedObj[val] = localizedObj[val].replace(/#discountPercentage/, discountPercentage);
        localizedObj[val] = localizedObj[val].replace(/#totalCups/, totalCupsCount);
        localizedObj[val] = localizedObj[val].replace(/#discountPrice/, discountPrice);
        localizedObj[val] = localizedObj[val].replace(/#period/, period);
        localizedObj[val] = localizedObj[val].replace(/#amount/, price);
        const nameTemp = name[val] ? name[val] : null;
        const currencyTemp = currency[val] ? currency[val] : null;
        if (nameTemp) {
          localizedObj[val] = localizedObj[val].replace(/#planName/, nameTemp);
        }
        if (currencyTemp) {
          localizedObj[val] = localizedObj[val].replace(/#currency/, currencyTemp);
        }
      }
    };
    if (localizedObj && totalCupsCount && discountPrice && discountPercentage && name && period) {
      langsX.map(t => localizeStr(t));
    }
    return localizedObj;
  }

}


module.exports = CommonContent;
