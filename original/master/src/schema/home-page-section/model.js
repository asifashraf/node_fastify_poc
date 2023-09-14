const BaseModel = require('../../base-model');
const { addLocalizationField, transformToCamelCase, removeLocalizationField } = require('../../lib/util');
const { first, filter, find, map } = require('lodash');
const { saveSectionTypeEnum, saveSectionErrorEnum, homePageSectionItemTypeEnum } = require('./enum');

class HomePageSection extends BaseModel {
  constructor(db, context) {
    super(db, 'home_page_sections', context);
  }

  async getByIdWithResolver(id, countryId) {
    const section = await this.db.table(this.tableName)
      .select(
        this.roDb.raw(
          `home_page_sections.*,
          hpss.id as section_setting_id,
          hpss.sort_order as sort_order,
          hpss.country_id,
          hpss.is_must as is_must,
          hpss.is_auth_required  as is_auth_required,
          hpss.is_location_based as is_location_based,
          hpss.is_paginated as is_paginated,
          hpss.per_page as per_page`
        )
      )
      .leftJoin(
        'home_page_section_settings as hpss',
        'hpss.section_id',
        'home_page_sections.id'
      )
      .where('home_page_sections.id', id)
      .where('hpss.country_id', countryId)
      .then(transformToCamelCase)
      .then(first);
    return addLocalizationField(section, 'header');
  }

  getQueryByFilters(filters) {
    let query = this.db(this.tableName)
      .orderBy('created', 'desc');
    if (filters) {
      query = query.where(filters);
    }
    return query;
  }

  async validateSection(sectionInfo) {
    const errors = [];
    if (!sectionInfo.itemType || !sectionInfo.refQueryId) {
      errors.push(saveSectionErrorEnum.MISSING_ARGUMENT);
    }
    /*let similarSections = null;
    if (sectionInfo.itemType && sectionInfo.refQueryId) {
      similarSections = await this.getQueryByFilters({ itemType: sectionInfo.itemType, refQueryId: sectionInfo.refQueryId });
    }*/
    if (sectionInfo.id) {
      /*const different = filter(similarSections, section => section.id != sectionInfo.id);
      if (different && different.length > 0) {
        errors.push(saveSectionErrorEnum.ALREADY_EXIST_ITEM_TYPE_AND_REF_QUERY_ID);
      }*/
      const section = this.getById(sectionInfo.id);
      if (!section) {
        errors.push(saveSectionErrorEnum.NOT_EXIST);
      }
    } /*else {
      if (similarSections && similarSections.length > 0) {
        errors.push(saveSectionErrorEnum.ALREADY_EXIST_ITEM_TYPE_AND_REF_QUERY_ID);
      }
    }*/
    const retVal = [];
    for (const err of errors) {
      const obj = {};
      obj.error = err;
      obj.type = saveSectionTypeEnum.SECTION;
      obj.countryId = null;
      retVal.push(obj);
    }
    return retVal;
  }

  async validateSectionSetting(sectionSettingInfo) {
    const errors = [];
    /*for (const setting of sectionSettingInfo) {
      let existing = await this.context.homePageSectionSetting.getQueryByFilters({ countryId: setting.countryId, sortOrder: setting.sortOrder });
      if (setting.sectionId) {
        existing = filter(existing, e => e.sectionId != setting.sectionId);
      }
      if (existing && existing.length > 0) {
        const obj = {};
        obj.error = saveSectionErrorEnum.SORT_ORDER_EXIST;
        obj.type = saveSectionTypeEnum.SECTION_SETTING;
        obj.countryId = setting.countryId;
        errors.push(obj);
      }
    }*/
    return errors;
  }

  async saveSectionAndSettings({ sectionInfo, sectionSettingInfo }) {
    let errSec = [], errSecSet = [];
    if (sectionInfo) errSec = await this.validateSection(sectionInfo);
    if (sectionSettingInfo && sectionSettingInfo.length > 0) errSecSet = await this.validateSectionSetting(sectionSettingInfo);
    const errors = [...errSec, ...errSecSet];
    if (errors && errors.length > 0) {
      return { errors, sections: null };
    }
    let sectionId;
    if (sectionInfo) sectionId = await this.save(removeLocalizationField(sectionInfo, 'header'));
    const sections = [];
    for (const setting of sectionSettingInfo) {
      if (sectionId) setting.sectionId = sectionId;
      await this.context.homePageSectionSetting.save(setting);
      const saved = await this.getByIdWithResolver(setting.sectionId, setting.countryId);
      sections.push(saved);
    }

    return { errors: null, sections };
  }

  async getAllSectionsByCountryId(countryId, filters) {
    let sections = this.db.table(this.tableName)
      .select(
        this.roDb.raw(
          `home_page_sections.*,
          hpss.id as section_setting_id,
          hpss.sort_order as sort_order,
          hpss.country_id,
          hpss.is_must as is_must,
          hpss.is_auth_required  as is_auth_required,
          hpss.is_location_based as is_location_based,
          hpss.is_paginated as is_paginated,
          hpss.per_page as per_page,
          hpss.id as section_info_id`
        )
      )
      .leftJoin(
        'home_page_section_settings as hpss',
        'hpss.section_id',
        'home_page_sections.id'
      );
    if (filters) { sections = sections.where(filters); } else { sections = sections.where('status', 'ACTIVE'); }
    sections.andWhere('hpss.country_id', countryId)
      .orderBy('sort_order', 'asc');
    // NOTE: Bypassed for backward compatibility (for IOS, Android)
    // if (!this.context.auth.id) sections.whereNotIn('home_page_sections.ref_query_id', ['REORDER_ITEM', 'ORDER_TRACKING']);
    sections = await sections;
    const infiniteSection = find(sections, s => s.itemType == homePageSectionItemTypeEnum.CARD_LIST_ITEM && s.isPaginated);
    if (infiniteSection) {
      map(sections, s => {
        if (s.id == infiniteSection.id) {
          s.pageIndex = 0;
        } else {
          s.pageIndex = null;
        }
      });
      addLocalizationField(sections, 'header');
      const divideSections = filter(sections, s => s.sortOrder > infiniteSection.sortOrder);
      if (!divideSections || divideSections.length == 0) {
        return sections;
      }
      let sortOrder = infiniteSection.sortOrder;
      let pageIndex = 1;
      const newLst = [];
      for (let i = 0; i < sections.length; i++) {
        if (sections[i].id == infiniteSection.id) {
          sections[i].pageIndex = pageIndex;
          newLst.push(sections[i]);
        } else if (find(divideSections, s => s.id == sections[i].id)) {
          sortOrder = sortOrder + 1;
          sections[i].sortOrder = sortOrder;
          sections[i].pageIndex = null;
          newLst.push(sections[i]);
          sortOrder = sortOrder + 1;
          pageIndex = pageIndex + 1;
          const newPage = JSON.parse(JSON.stringify(infiniteSection));
          newPage.sortOrder = sortOrder;
          newPage.pageIndex = pageIndex;
          newLst.push(newPage);
        } else {
          sections[i].pageIndex = null;
          newLst.push(sections[i]);
        }
      }
      return newLst;
    }
    addLocalizationField(sections, 'header');
    return sections;

  }
}

module.exports = HomePageSection;
