const BaseModel = require('../../base-model');
const { addLocalizationField, removeLocalizationField } = require('../../lib/util');
const { uniq, map, find } = require('lodash');
const { saveSectionErrorEnum, homePageSectionItemTypeEnum, homePageSectionStatusEnum } = require('./enum');
const isUUID = require('is-uuid');

class HomePageSection extends BaseModel {
  constructor(db, context) {
    super(db, 'home_page_sections', context);
  }

  async getById(id) {
    const section = await super.getById(id);
    return addLocalizationField(section, 'header');
  }

  async validate(sectionInfo) {
    const errors = [];
    if (!sectionInfo.itemType || !sectionInfo.refQueryId) {
      errors.push(saveSectionErrorEnum.MISSING_ARGUMENT);
    }

    /*let similarSections = null;
    if (sectionInfo.itemType && sectionInfo.refQueryId) {
      similarSections = await this.getQueryByFilters({ itemType: sectionInfo.itemType, refQueryId: sectionInfo.refQueryId });
    }*/

    let checkPaginatedItem = false;
    switch (sectionInfo.itemType) {
      case homePageSectionItemTypeEnum.CARD_LIST_ITEM:
        if (!sectionInfo.perPage || sectionInfo.perPage < 1) {
          errors.push(saveSectionErrorEnum.PER_PAGE_SHOULD_BE_BIGGER_THAN_ZERO);
        }
        checkPaginatedItem = sectionInfo.isPaginated && sectionInfo.status == homePageSectionStatusEnum.ACTIVE;
        break;
      case homePageSectionItemTypeEnum.SEARCH_ITEM:
      case homePageSectionItemTypeEnum.REORDER_ITEM:
      case homePageSectionItemTypeEnum.ICON_BUTTON_ITEM:
      case homePageSectionItemTypeEnum.CAROUSEL_ITEM:
      case homePageSectionItemTypeEnum.ORDER_TRACKING_ITEM:
        if (sectionInfo.isPaginated) {
          errors.push(saveSectionErrorEnum.CARD_LIST_ITEM_ONLY_CAN_BE_PAGINATED);
        }
        break;
      case homePageSectionItemTypeEnum.BRAND_HORIZONTAL_CARD_LIST_ITEM:
      case homePageSectionItemTypeEnum.BRAND_LOCATION_HORIZONTAL_CARD_LIST_ITEM:
      case homePageSectionItemTypeEnum.SUBSCRIPTION_HORIZONTAL_CARD_LIST_ITEM:
      case homePageSectionItemTypeEnum.EXPRESS_DELIVERY_HORIZONTAL_CARD_LIST_ITEM:
        if (sectionInfo.isPaginated) {
          errors.push(saveSectionErrorEnum.CARD_LIST_ITEM_ONLY_CAN_BE_PAGINATED);
        }
        if (!sectionInfo.perPage || sectionInfo.perPage < 1) {
          errors.push(saveSectionErrorEnum.PER_PAGE_SHOULD_BE_BIGGER_THAN_ZERO);
        }
        break;
      default:
        break;
    }

    if (sectionInfo.id) {
      /*const different = filter(similarSections, section => section.id != sectionInfo.id);
      if (different && different.length > 0) {
        errors.push(saveSectionErrorEnum.ALREADY_EXIST_ITEM_TYPE_AND_REF_QUERY_ID);
      }*/
      const section = await this.getById(sectionInfo.id);
      if (!section) {
        errors.push(saveSectionErrorEnum.NOT_EXIST);
      } else {
        if (section.countryId != sectionInfo.countryId) {
          errors.push(saveSectionErrorEnum.SECTION_COUNTRY_CAN_NOT_CHANGE);
        }
        if (section.itemType != sectionInfo.itemType) {
          errors.push(saveSectionErrorEnum.SECTION_ITEM_TYPE_CAN_NOT_CHANGE);
        }
        if (section.status == homePageSectionStatusEnum.DELETED) {
          errors.push(saveSectionErrorEnum.DELETED_SECTION_CAN_NOT_BE_UPDATE);
        }
      }
    } else {
      if (sectionInfo.status == homePageSectionStatusEnum.DELETED) {
        errors.push(saveSectionErrorEnum.SECTION_CAN_NOT_CREATE_WITH_DELETED_STATUS);
      }
    }

    if (errors.length == 0 && checkPaginatedItem) {
      const paginatedSections = await this.getActiveCardLisItemSections(sectionInfo.countryId, true);
      const sectionIds = paginatedSections.map(section => section.id);
      if (sectionInfo.id) {
        if (paginatedSections.length > 0 && !sectionIds.includes(sectionInfo.id)) {
          errors.push(saveSectionErrorEnum.ONLY_ALLOWED_ONE_ACTIVE_PAGINATED_SECTION);
        }
      } else if (paginatedSections.length > 0) {
        errors.push(saveSectionErrorEnum.ONLY_ALLOWED_ONE_ACTIVE_PAGINATED_SECTION);
      }
    }
    return errors;
  }

  async validateSortOrder(countryId, sectionIds, status) {
    const errors = [];
    sectionIds = uniq(sectionIds);
    if (sectionIds.every(t => isUUID.v4(t))) {
      const sections = await this.db.table(this.tableName)
        .select('*')
        .where('status', status)
        .where('country_id', countryId);

      if (sectionIds.length > sections.length) {
        errors.push(saveSectionErrorEnum.INVALID_SECTION_ID);
      } else if (sectionIds.length < sections.length) {
        errors.push(saveSectionErrorEnum.MISSING_SECTION_ID);
      }
      const section = find(sections, { itemType: homePageSectionItemTypeEnum.CARD_LIST_ITEM, isPaginated: true});
      if (section && sectionIds.at(-1) != section.id) {
        errors.push(saveSectionErrorEnum.PAGINATED_SECTION_MUST_BE_END_OF_LIST);
      }
    } else errors.push(saveSectionErrorEnum.INVALID_SECTION_ID);
    return errors;
  }

  async save(sectionInfo) {
    let oldSection = null;
    const updateProcess = [];
    const allActiveSections = await this.db.table(this.tableName)
      .select('*')
      .where('country_id', sectionInfo.countryId)
      .where('status', sectionInfo.status)
      .orderBy('sort_order', 'asc');
    if (sectionInfo.id) {
      oldSection = await this.getById(sectionInfo.id);
      if (oldSection.status != sectionInfo.status) {
        if (sectionInfo.status == homePageSectionStatusEnum.ACTIVE) {
          const lastSection = allActiveSections.at(-1);
          if (lastSection.itemType == homePageSectionItemTypeEnum.CARD_LIST_ITEM && lastSection.isPaginated) {
            sectionInfo.sortOrder = Number(lastSection.sortOrder);
            lastSection.sortOrder = Number(lastSection.sortOrder) + 1;
            updateProcess.push(super.save(lastSection));
          }
        } else {
          sectionInfo.sortOrder = null;
          let afterSection = false;
          allActiveSections.map(section => {
            if (section.id !== sectionInfo.id) {
              if (afterSection) {
                section.sortOrder = Number(section.sortOrder) - 1;
                updateProcess.push(super.save(section));
              }
            } else afterSection = true;
          });
        }
      } else if (
        sectionInfo.status == homePageSectionStatusEnum.ACTIVE &&
        sectionInfo.itemType == homePageSectionItemTypeEnum.CARD_LIST_ITEM &&
        sectionInfo.isPaginated) {
        let afterSection = false;
        allActiveSections.map(section => {
          if (section.id != sectionInfo.id) {
            if (afterSection) {
              section.sortOrder = Number(section.sortOrder) - 1;
              updateProcess.push(super.save(section));
            }
          } else {
            afterSection = true;
            sectionInfo.sortOrder = allActiveSections.length;
          }
        });
      }
    } else if (sectionInfo.status == homePageSectionStatusEnum.ACTIVE) {
      const lastSection = allActiveSections.at(-1);
      if (lastSection.itemType == homePageSectionItemTypeEnum.CARD_LIST_ITEM && lastSection.isPaginated) {
        sectionInfo.sortOrder = Number(lastSection.sortOrder);
        lastSection.sortOrder = Number(lastSection.sortOrder) + 1;
        updateProcess.push(super.save(lastSection));
      } else sectionInfo.sortOrder = Number(lastSection.sortOrder) + 1;
    }

    const sectionId = await super.save(removeLocalizationField(sectionInfo, 'header'));
    await Promise.all(updateProcess);
    await this.updateOffsetValues(sectionInfo.countryId);
    return this.getById(sectionId);
  }

  async sort(countryId, sectionIds, status) {
    const updateSortOrder = [];
    map(sectionIds, (value, index) => {
      updateSortOrder.push(
        this.db(this.tableName)
          .where('id', value)
          .update({sortOrder: index})
      );
    });
    await Promise.all(updateSortOrder);
    return await this.getSectionsByCountryId(countryId, {status});
  }

  async getSectionsByCountryId(countryId, filters) {
    let query = this.db.table(this.tableName)
      .select('*')
      .where('country_id', countryId);
    if (filters) {
      query = query.where(filters);
    }
    query = query.orderBy('sort_order', 'asc');

    // NOTE: Bypassed for backward compatibility (for IOS, Android)
    // if (!this.context.auth.id) sections.whereNotIn('home_page_sections.ref_query_id', ['REORDER_ITEM', 'ORDER_TRACKING']);
    const sections = await query;
    addLocalizationField(sections, 'header');
    return sections;
  }

  async getActiveCardLisItemSections(countryId, onlyPaginated) {
    let query = this.db.table(this.tableName)
      .select('*')
      .where('country_id', countryId)
      .where('item_type', homePageSectionItemTypeEnum.CARD_LIST_ITEM)
      .where('status', homePageSectionStatusEnum.ACTIVE);
    if (onlyPaginated) {
      query = query.where('is_paginated', true);
    }
    query = query.orderBy('sort_order', 'asc');
    return query;
  }

  async updateOffsetValues(countryId) {
    const getActiveCardListSections = await this.getActiveCardLisItemSections(countryId, false);
    if (getActiveCardListSections.length > 0) {
      const updateOffset = [];
      let offset = 0;
      getActiveCardListSections.map(section => {
        if (!section.offset || Number(section.offset) != offset) {
          section.offset = offset;
          updateOffset.push(super.save(section));
        }
        offset += Number(section.perPage);
      });
      if (updateOffset.length > 0) {
        await Promise.all(updateOffset);
      }
    }
  }
}

module.exports = HomePageSection;
