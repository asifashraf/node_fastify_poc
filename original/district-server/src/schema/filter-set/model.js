/* eslint-disable camelcase */
const BaseModel = require('../../base-model');
const { formatError, addPaging } = require('../../lib/util');
const { defaultFilterValuesByCountryId } = require('./default-configurations');
const { filterSaveError } = require('./enums');
const { omit } = require('lodash');
const isUUID = require('is-uuid');

class FilterSet extends BaseModel {
  constructor(db, context) {
    super(db, 'filter_sets', context);
  }

  async getAll(filters, paging) {
    const results = await this.getQueryByFilters(filters, paging);
    return results && results.length > 0
      ? results.map(filterSetFromDb => {
        return {
          id: filterSetFromDb.id,
          analyticsEventName: filterSetFromDb.analyticsEventName,
          isSearchable: filterSetFromDb.isSearchable,
          fulfillmentTypes: filterSetFromDb.fulfillmentTypes,
          brandIds: filterSetFromDb.brandIds,
          tagIds: filterSetFromDb.tagIds,
          offer: filterSetFromDb.offer,
          freeDelivery: filterSetFromDb.freeDelivery,
          rating: filterSetFromDb.rating,
          created: filterSetFromDb.created,
          updated: filterSetFromDb.updated,
          title: {
            en: filterSetFromDb.title,
            ar: filterSetFromDb.titleAr,
            tr: filterSetFromDb.titleTr,
          },
          emptyData: {
            icon: {
              en: filterSetFromDb.emptyDataIcon,
              ar: filterSetFromDb.emptyDataIconAr,
              tr: filterSetFromDb.emptyDataIconTr,
            },
            title: {
              en: filterSetFromDb.emptyDataTitle,
              ar: filterSetFromDb.emptyDataTitleAr,
              tr: filterSetFromDb.emptyDataTitleTr,
            },
            description: {
              en: filterSetFromDb.emptyDataDescription,
              ar: filterSetFromDb.emptyDataDescriptionAr,
              tr: filterSetFromDb.emptyDataDescriptionTr,
            },
            buttonTitle: {
              en: filterSetFromDb.emptyDataButtonTitle,
              ar: filterSetFromDb.emptyDataButtonTitleAr,
              tr: filterSetFromDb.emptyDataButtonTitleTr,
            },
            deeplink: filterSetFromDb.emptyDataDeeplink
          }
        };
      })
      : [];
  }

  getQueryByFilters(filters, paging) {
    let query = this.db(this.tableName)
      .orderBy('created', 'desc');
    if (filters?.searchText) {
      query = query.whereRaw('(LOWER(title) iLIKE LOWER(?) or LOWER(title_ar) iLIKE LOWER(?) or LOWER(title_tr) iLIKE LOWER(?))'
        , [`%${filters.searchText}%`, `%${filters.searchText}%`, `%${filters.searchText}%`]);
      filters = omit(filters, [
        'searchText',
      ]);
    }
    if (filters) {
      query = query.andWhere(filters);
    }
    if (paging) {
      query = addPaging(query, paging);
    }
    return query;
  }

  async validate(filterSetInput) {
    const errors = [];
    if (!filterSetInput) {
      errors.push(filterSaveError.INVALID_INPUT);
    }

    if (!filterSetInput?.title?.en) {
      errors.push(filterSaveError.INVALID_TITLE);
    } else {
      if (!(filterSetInput?.title?.en.trim().length > 0)) {
        errors.push(filterSaveError.INVALID_TITLE);
      }
    }

    if (filterSetInput?.isSearchable === undefined || filterSetInput?.isSearchable === null) {
      errors.push(filterSaveError.INVALID_SEARCHABLE);
    }

    if (!filterSetInput?.analyticsEventName) {
      errors.push(filterSaveError.INVALID_ANALYTICS_TAG);
    } else {
      if (!(filterSetInput?.analyticsEventName.trim().length > 0)) {
        errors.push(filterSaveError.INVALID_ANALYTICS_TAG);
      }
    }

    if (!filterSetInput?.emptyData?.deeplink) {
      errors.push(filterSaveError.INVALID_EMPTY_DATA_DEEPLINK);
    } else {
      if (!(filterSetInput?.emptyData?.deeplink.trim().length > 0)) {
        errors.push(filterSaveError.INVALID_EMPTY_DATA_DEEPLINK);
      }
    }

    if (!filterSetInput?.emptyData?.title?.en) {
      errors.push(filterSaveError.INVALID_EMPTY_DATA_TITLE);
    } else {
      if (!(filterSetInput?.emptyData?.title?.en.trim().length > 0)) {
        errors.push(filterSaveError.INVALID_EMPTY_DATA_TITLE);
      }
    }

    if (!filterSetInput?.emptyData?.icon?.en) {
      errors.push(filterSaveError.INVALID_EMPTY_DATA_ICON);
    } else {
      if (!(filterSetInput?.emptyData?.icon?.en.trim().length > 0)) {
        errors.push(filterSaveError.INVALID_EMPTY_DATA_ICON);
      }
    }

    if (!filterSetInput?.emptyData?.buttonTitle?.en) {
      errors.push(filterSaveError.INVALID_EMPTY_DATA_BUTTON_TITLE);
    } else {
      if (!(filterSetInput?.emptyData?.buttonTitle?.en.trim().length > 0)) {
        errors.push(filterSaveError.INVALID_EMPTY_DATA_BUTTON_TITLE);
      }
    }

    if (!filterSetInput?.emptyData?.description?.en) {
      errors.push(filterSaveError.INVALID_EMPTY_DATA_DESCRIPTION);
    } else {
      if (!(filterSetInput?.emptyData?.description?.en.trim().length > 0)) {
        errors.push(filterSaveError.INVALID_EMPTY_DATA_DESCRIPTION);
      }
    }

    if (filterSetInput?.brandIds) {
      if (filterSetInput.brandIds.length > 0 && filterSetInput?.brandIds.every(t => isUUID.v4(t))) {
        const brands = await this.context.brand.getById(filterSetInput?.brandIds);
        if (brands && brands.length > 0 && brands.every(t => !!t)) {
          const count = brands.length;
          if (filterSetInput?.brandIds.length !== count) {
            errors.push(filterSaveError.INVALID_BRAND_IDS);
          }
        } else {
          errors.push(filterSaveError.INVALID_BRAND_IDS);
        }
      } else {
        errors.push(filterSaveError.INVALID_BRAND_IDS);
      }
    }

    if (filterSetInput?.tagIds) {
      if (filterSetInput.tagIds.length > 0 && filterSetInput?.tagIds.every(t => isUUID.v4(t))) {
        const tags = await this.context.tag.getByIds(filterSetInput?.tagIds);
        if (tags && tags.length > 0 && tags.every(t => !!t)) {
          const count = tags.length;
          if (filterSetInput?.tagIds.length !== count) {
            errors.push(filterSaveError.INVALID_TAG_IDS);
          }
        } else {
          errors.push(filterSaveError.INVALID_TAG_IDS);
        }
      } else {
        errors.push(filterSaveError.INVALID_TAG_IDS);
      }
    }

    if (!(filterSetInput?.fulfillmentTypes
      && filterSetInput?.fulfillmentTypes.length > 0
      && filterSetInput?.fulfillmentTypes.every(t => typeof t === 'string'))) {
      errors.push(filterSaveError.INVALID_FULFILLMENT_TYPES);
    }

    if (filterSetInput?.rating) {
      if (filterSetInput.rating.length == 0 || !filterSetInput?.rating.every(t => Number.isInteger(t) && t > 0 && t < 6)) {
        errors.push(filterSaveError.INVALID_RATING_INPUT);
      }
    }

    return errors;
  }

  async save(filterSetInput) {
    const errors = await this.validate(filterSetInput);
    if (errors.length > 0) {
      return formatError(errors);
    }

    const filterSetVals = {
      title: filterSetInput.title.en,
      titleAr: filterSetInput.title?.ar ?? filterSetInput.title.en,
      titleTr: filterSetInput.title?.tr ?? filterSetInput.title.en,

      emptyDataIcon: filterSetInput.emptyData.icon.en,
      emptyDataIconAr: filterSetInput.emptyData.icon?.ar ?? '',
      emptyDataIconTr: filterSetInput.emptyData.icon?.tr ?? '',

      emptyDataTitle: filterSetInput.emptyData.title.en,
      emptyDataTitleAr: filterSetInput.emptyData.title?.ar ?? '',
      emptyDataTitleTr: filterSetInput.emptyData.title?.tr ?? '',

      emptyDataDescription: filterSetInput.emptyData.description.en,
      emptyDataDescriptionAr: filterSetInput.emptyData.description?.ar ?? '',
      emptyDataDescriptionTr: filterSetInput.emptyData.description?.tr ?? '',

      emptyDataButtonTitle: filterSetInput.emptyData.buttonTitle.en,
      emptyDataButtonTitleAr: filterSetInput.emptyData.buttonTitle.ar ?? '',
      emptyDataButtonTitleTr: filterSetInput.emptyData.buttonTitle.tr ?? '',

      emptyDataDeeplink: filterSetInput.emptyData.deeplink,
    };
    delete filterSetInput.emptyData;
    delete filterSetInput.title;
    if (filterSetInput.brandIds) {
      filterSetInput.brandIds = JSON.stringify(filterSetInput.brandIds);
    }
    if (filterSetInput.tagIds) {
      filterSetInput.tagIds = JSON.stringify(filterSetInput.tagIds);
    }
    if (filterSetInput.fulfillmentTypes) {
      filterSetInput.fulfillmentTypes = JSON.stringify(filterSetInput.fulfillmentTypes);
    }
    if (filterSetInput.rating) {
      filterSetInput.rating = JSON.stringify(filterSetInput.rating);
    }
    const cloneFilterSet = { ...filterSetVals, ...filterSetInput };

    const id = await super.save(cloneFilterSet);
    const filterSets = await this.getAll({id}, null);
    return {
      filterSet: filterSets[0],
    };
  }

  async deleteById(filterSetId) {
    let res = 0;
    if (filterSetId) {
      const filterSet = await this.getById(filterSetId);
      if (filterSet) {
        res = await super.deleteById(filterSet.id);
      }
    }
    return Boolean(res);
  }

  async getFilterModel(countryId) {
    let filterModels = defaultFilterValuesByCountryId.filter(filter => filter.countryIds.includes(countryId));
    filterModels = filterModels.map(filterModel => {
      return omit(filterModel, ['countryIds']);
    });
    return filterModels;
  }
}


module.exports = FilterSet;
