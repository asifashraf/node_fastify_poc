const BaseModel = require('../../base-model');
const { addLocalizationMultipleFields, transformToCamelCase, removeLocalizationMultipleFields } = require('../../lib/util');
const { first } = require('lodash');
const { saveCarouselItemErrorEnum, saveCarouselItemTypeEnum, carouselItemStatusEnum } = require('./enum.js');
const { calculateCarouselItemsKey, getCachedCarouselItems, saveCachedCarouselItems, invalidateCarouselItems } = require('./redis-helper');

class CarouselItem extends BaseModel {
  constructor(db, context) {
    super(db, 'home_page_carousel_items', context);
  }

  async getAllItems({ refQueryId, countryId }) {
    if (refQueryId == 'BANNER') {
      return this.getBanner({ countryId });
    }
  }

  async getBanner({ countryId }) {
    const cachedKey = calculateCarouselItemsKey(countryId);
    const cachedData = await getCachedCarouselItems(cachedKey);
    if (cachedData && cachedData.length > 0) {
      return cachedData;
    }
    const items = await this.getByIdWithResolver(null, countryId);
    if (items && items.length > 0) await saveCachedCarouselItems(cachedKey, items);
    return items;
  }

  async getByIdWithResolver(id, countryId) {
    let carouselItemQuery = this.db.table(this.tableName)
      .select(
        this.roDb.raw(
          `home_page_carousel_items.*,
          hpcis.sort_order as sort_order,
          hpcis.id as carousel_setting_id,
          hpcis.country_id as country_id,
          hpcis.duration_time_in_ms as duration_time_in_ms`
        )
      )
      .leftJoin(
        'home_page_carousel_item_settings as hpcis',
        'hpcis.item_id',
        'home_page_carousel_items.id'
      )
      .where('hpcis.country_id', countryId)
      .where('status', carouselItemStatusEnum.ACTIVE)
      .orderBy('sort_order', 'asc');
    if (id) {
      carouselItemQuery = await carouselItemQuery.where('home_page_carousel_items.id', id)
        .then(first);
    } else {
      carouselItemQuery = await carouselItemQuery.then(transformToCamelCase);
    }
    return addLocalizationMultipleFields(carouselItemQuery, ['image']);
  }

  getQueryByFilters(filters) {
    let query = this.db(this.tableName)
      .orderBy('created', 'desc');
    if (filters) {
      query = query.where(filters);
    }
    return query;
  }

  async validateCarouselItem(carouselItemInfo, carouselItemSettingInfo) {
    const errors = [];
    if (!carouselItemInfo.image) {
      errors.push(saveCarouselItemErrorEnum.MISSING_ARGUMENT);
    }
    if (carouselItemInfo.id) {
      for (const setting of carouselItemSettingInfo) {

        if (!setting?.id) {
          errors.push(saveCarouselItemErrorEnum.ID_AND_SETTING_ID_BOTH_REQUIRED_FOR_UPDATE);
        }
      }
      const carouselItem = await this.getQueryByFilters({ id: carouselItemInfo.id });
      if (!carouselItem) {
        errors.push(saveCarouselItemErrorEnum.NOT_EXIST);
      }
    }
    const retVal = [];
    for (const e of errors) {
      const obj = {};
      obj.error = e;
      obj.type = saveCarouselItemTypeEnum.CAROUSEL_ITEM;
      obj.countryId = null;
      retVal.push(obj);
    }
    return retVal;
  }

  async validateCarouselItemSetting(carouselItemSettingInfo) {
    const errors = [];
    /*for (const setting of carouselItemSettingInfo) {
      let existing = await this.context.carouselItemSetting.getQueryByFilters({ countryId: setting.countryId, sortOrder: setting.sortOrder });
      if (setting.itemId) {
        existing = filter(existing, e => e.itemId != setting.itemId);
      }
      if (existing && existing.length > 0) {
        const obj = {};
        obj.error = saveCarouselItemErrorEnum.SORT_ORDER_EXIST;
        obj.type = saveCarouselItemTypeEnum.CAROUSEL_ITEM_SETTING;
        obj.countryId = setting.countryId;
        errors.push(obj);
      }
    }*/
    return errors;
  }

  async validateSectionId(sectionId) {
    const errors = [];
    const section = await this.context.homePageSection.getById(sectionId);
    if (!section) {
      const obj = {};
      obj.error = saveCarouselItemErrorEnum.INVALID_SECTION_ID;
      obj.type = saveCarouselItemTypeEnum.SECTION_ID;
      errors.push(obj);
    }
    return errors;
  }

  async saveCarouselItemAndSettings({ carouselItemInfo, carouselItemSettingInfo }) {
    let errSection = [], errCarousel = [], errCarouselSet = [];
    if (carouselItemInfo) {
      errCarousel = await this.validateCarouselItem(carouselItemInfo, carouselItemSettingInfo);
      errSection = await this.validateSectionId(carouselItemInfo.sectionId);
    }
    if (carouselItemSettingInfo && carouselItemSettingInfo.length > 0) errCarouselSet = await this.validateCarouselItemSetting(carouselItemSettingInfo);
    const errors = [...errCarousel, ...errCarouselSet, ...errSection];

    if (errors && errors.length > 0) {
      return { errors, items: null };
    }
    await invalidateCarouselItems();
    let itemId;
    if (carouselItemInfo) itemId = await this.save(removeLocalizationMultipleFields(carouselItemInfo, ['image']));
    const items = [];
    for (const setting of carouselItemSettingInfo) {
      if (itemId) setting.itemId = itemId;
      const savedId = await this.context.carouselItemSetting.save(setting);
      const itemSetting = await this.context.carouselItemSetting.getById(savedId);
      const saved = await this.getByIdWithResolver(itemSetting.itemId, setting.countryId);
      items.push(saved);
    }
    return { errors: null, items };
  }

  async getAllWithResolver({ countryId, sectionId, status }) {
    if (!status) status = carouselItemStatusEnum.ACTIVE;
    let carouselItemQuery = this.db.table(this.tableName)
      .select(
        this.roDb.raw(
          `home_page_carousel_items.*,
          hpcis.sort_order as sort_order,
          hpcis.id as carousel_setting_id,
          hpcis.country_id as country_id,
          hpcis.duration_time_in_ms as duration_time_in_ms`
        )
      )
      .leftJoin(
        'home_page_carousel_item_settings as hpcis',
        'hpcis.item_id',
        'home_page_carousel_items.id'
      )
      .where('hpcis.country_id', countryId)
      .where('status', status)
      .orderBy('sort_order', 'asc');
    if (sectionId) carouselItemQuery = carouselItemQuery.where('home_page_carousel_items.section_id', sectionId);
    carouselItemQuery = await carouselItemQuery.then(transformToCamelCase);
    return addLocalizationMultipleFields(carouselItemQuery, ['image']);
  }

}

module.exports = CarouselItem;
