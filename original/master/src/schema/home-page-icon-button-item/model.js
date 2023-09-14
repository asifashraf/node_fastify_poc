const BaseModel = require('../../base-model');
const { transformToCamelCase, removeLocalizationField, addLocalizationMultipleFields } = require('../../lib/util');
const { first } = require('lodash');
const { saveIconButtonErrorEnum, SaveIconButtonItemTypeEnum, IconItemStatusEnum } = require('../home-page-icon-button-item/enum');
class IconButtonItem extends BaseModel {
  constructor(db, context) {
    super(db, 'home_page_icon_button_items', context);
  }

  getQueryByFilters(filters) {
    let query = this.db(this.tableName)
      .orderBy('created', 'desc');
    if (filters) {
      query = query.where(filters);
    }
    return query;
  }

  async getAllItems({ refQueryId, countryId }) {
    let items = await this.db.table(this.tableName)
      .select(
        this.roDb.raw(
          `home_page_icon_button_items.*,
        hp.sort_order as sort_order,
        hp.country_id,
        hp.is_sticky as is_sticky,
        hp.id as icon_setting_id
        `
        )
      )
      .leftJoin(
        'home_page_icon_button_item_settings as hp',
        'hp.item_id',
        'home_page_icon_button_items.id'
      )
      .where('hp.country_id', countryId)
      .andWhere('home_page_icon_button_items.status', 'ACTIVE')
      .orderBy('sort_order', 'asc');
    items = await items;
    const data = addLocalizationMultipleFields(items, ['title']);
    return data;
  }


  async validateIconButtonItem(iconButtonItemInfo) {

    const errors = [];
    if (!iconButtonItemInfo.image || !iconButtonItemInfo.title || !iconButtonItemInfo.deeplink || !iconButtonItemInfo.spanSize) {
      errors.push(saveIconButtonErrorEnum.MISSING_ARGUMENT);
      return errors;
    }

    if(iconButtonItemInfo.spanSize && (iconButtonItemInfo.spanSize < 1 || iconButtonItemInfo.spanSize > 4)){
      errors.push(saveIconButtonErrorEnum.INVALID_SPAN_SIZE);
      return errors;
    }

    let similarIconButtons = null;
    similarIconButtons = await this.getQueryByFilters({ deeplink: iconButtonItemInfo.deeplink, image: iconButtonItemInfo.image });
    if (iconButtonItemInfo.id) {
      const ButtonItem = this.getById(iconButtonItemInfo.id);
      if (!ButtonItem) {
        errors.push(saveIconButtonErrorEnum.NOT_EXIST);
      }
    } else {
      if (similarIconButtons && similarIconButtons.length > 0) {
        errors.push(saveIconButtonErrorEnum.ALREADY_EXIST_IMAGE_TYPE_AND_DEEP_LINK);
      }
    }
    const retVal = [];
    for (const err of errors) {
      const obj = {};
      obj.error = err;
      obj.type = SaveIconButtonItemTypeEnum.ICON_BUTTON_ITEM;
      obj.countryId = null;
      retVal.push(obj);
    }

    return retVal;

  }


  async validateIconButtonItemSetting(iconButtonItemSettingInfo) {
    // check if there is any row that has same item_id and country_id, sort_order

    const errors = [];
    /* for await (const setting of iconButtonItemSettingInfo) {
       let existing = await this.context.iconButtonItemSetting.getQueryByFilters({ countryId: setting.countryId, sortOrder: setting.sortOrder });
       if (setting.itemId) {
         existing = filter(existing, e => e.itemId != setting.itemId);
       }
       if (existing && existing.length > 0) {
         const obj = {};
         obj.error = saveIconButtonErrorEnum.SORT_ORDER_EXIST;
         obj.type = SaveIconButtonItemTypeEnum.ICON_BUTTON_ITEM_SETTING;
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
      obj.error = saveIconButtonErrorEnum.INVALID_SECTION_ID;
      obj.type = SaveIconButtonItemTypeEnum.SECTION_ID;
      errors.push(obj);
    }
    return errors;
  }

  async saveItemAndSettings({ iconButtonItemInfo, iconButtonItemSettingInfo }) {
    let errSection = [], errIconButton = [], errIconlSet = [];
    if (iconButtonItemInfo) {
      errSection = await this.validateSectionId(iconButtonItemInfo.sectionId);
      errIconButton = await this.validateIconButtonItem(iconButtonItemInfo);
    }
    if (iconButtonItemSettingInfo && iconButtonItemSettingInfo.length > 0) errIconlSet = await this.validateIconButtonItemSetting(iconButtonItemSettingInfo);
    const errors = [...errIconlSet, ...errIconButton, ...errSection];
    if (errors && errors.length > 0) {

      return { errors, items: null };
    }
    let itemId;
    if (iconButtonItemInfo) itemId = await this.save(removeLocalizationField(iconButtonItemInfo, 'title'));

    const items = [];
    for (const setting of iconButtonItemSettingInfo) {
      if (itemId) setting.itemId = itemId;
      const savedId = await this.context.iconButtonItemSetting.save(setting);
      const itemSetting = await this.context.iconButtonItemSetting.getById(savedId);
      const saved = await this.getByIdWithResolver(itemSetting.itemId, setting.countryId);
      items.push(saved);
    }

    return { errors: null, items };


  }
  async getByIdWithResolver(id, countryId) {
    const iconButtonItems = await this.db.table(this.tableName)
      .select(
        this.roDb.raw(
          `home_page_icon_button_items.*,
          hpibis.sort_order as sort_order,
          hpibis.country_id,
          hpibis.is_sticky as is_sticky,
          hpibis.id as icon_setting_id`
        )
      )
      .leftJoin(
        'home_page_icon_button_item_settings as hpibis',
        'hpibis.item_id',
        'home_page_icon_button_items.id'
      )
      .where('home_page_icon_button_items.id', id)
      .where('hpibis.country_id', countryId)
      .then(transformToCamelCase)
      .then(first);
    return addLocalizationMultipleFields(iconButtonItems, ['title']);
  }
  async getAllWithResolver({ countryId, sectionId, status }) {
    if (!status) status = IconItemStatusEnum.ACTIVE;
    let IconItemQuery = this.db.table(this.tableName)
      .select(
        this.roDb.raw(
          `home_page_icon_button_items.*,
            hpibis.sort_order as sort_order,
            hpibis.id as icon_setting_id,
            hpibis.country_id,
            hpibis.is_sticky as is_sticky`
        )
      )
      .leftJoin(
        'home_page_icon_button_item_settings as hpibis',
        'hpibis.item_id',
        'home_page_icon_button_items.id'
      )
      .where('hpibis.country_id', countryId);
    if (sectionId) IconItemQuery = IconItemQuery.where('home_page_icon_button_items.section_id', sectionId);
    IconItemQuery.where('status', status)
      .orderBy('sort_order', 'asc');
    IconItemQuery = await IconItemQuery.then(transformToCamelCase);
    return addLocalizationMultipleFields(IconItemQuery, ['title']);
  }

}

module.exports = IconButtonItem;
