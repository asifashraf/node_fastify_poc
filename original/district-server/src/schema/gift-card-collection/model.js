const BaseModel = require('../../base-model');
const { addLocalizationField } = require('../../lib/util');
const { createLoaders } = require('./loaders');
const { groupBy, isArray } = require('lodash');
const QueryHelper = require('../../lib/query-helper');
const {
  giftCardTemplateStatus,
  giftCardCollectionStatus,
  giftCardSectionType,
  giftCardCollectionSaveError
} = require('./../../../src/schema/root/enums');

class GiftCardCollection extends BaseModel {
  constructor(db, context) {
    super(db, 'gift_card_collections', context);
    this.loaders = createLoaders(this);
  }

  filterGiftCardCollection(query, filters) {
    if (filters.countryId)
      query.where('gift_card_collections.country_id', filters.countryId);

    if (filters.status)
      query.where('gift_card_collections.status', filters.status);

    if (filters.searchText) {
      filters.searchText = filters.searchText.toLowerCase().trim();
      query.whereRaw(
        '(LOWER(gift_card_collections.name) like ? or gift_card_collections.name_ar like ? or gift_card_collections.name_tr like ? )'
        , [`%${filters.searchText}%`, `%${filters.searchText}%`, `%${filters.searchText}%`],
      );
    }
    return query;
  }

  async getForApp(countryIso) {
    countryIso = (countryIso || '').toUpperCase();
    const rsp = await this.db(this.tableName)
      .select(`${this.tableName}.*`)
      .join('countries', 'countries.id', 'country_id')
      .where('countries.iso_code', countryIso)
      .andWhere(`${this.tableName}.status`, giftCardCollectionStatus.ACTIVE)
      .orderBy(`${this.tableName}.created`, 'asc');
    const templatesTotalCount = groupBy(
      await this.db
        .select(this.db.raw('gift_card_collections.id, count(1)'))
        .table('gift_card_templates')
        .join(
          'gift_card_collections',
          'gift_card_collections.id',
          'gift_card_templates.gift_card_collection_id'
        )
        .join('countries', 'countries.id', 'gift_card_collections.country_id')
        .whereRaw(
          `(gift_card_templates.available_from is null or gift_card_templates.available_from < current_timestamp) and
           (gift_card_templates.available_until is null or gift_card_templates.available_until > current_timestamp)`
        )
        .where('countries.iso_code', countryIso)
        .andWhere(
          'gift_card_collections.status',
          giftCardCollectionStatus.ACTIVE
        )
        .andWhere('gift_card_templates.status', giftCardTemplateStatus.ACTIVE)
        .groupBy('gift_card_collections.id'),
      'id'
    );

    const brands = addLocalizationField(
      await this.db
        .select(this.db.raw('brands.*'))
        .table('brands')
        .join(
          'gift_card_templates',
          'gift_card_templates.brand_id',
          'brands.id'
        )
        .join(
          'gift_card_collections',
          'gift_card_collections.id',
          'gift_card_templates.gift_card_collection_id'
        )
        .join('countries', 'countries.id', 'gift_card_templates.country_id')
        .whereRaw(
          `(gift_card_templates.available_from is null or gift_card_templates.available_from < current_timestamp) and
           (gift_card_templates.available_until is null or gift_card_templates.available_until > current_timestamp)`
        )
        .where('countries.iso_code', countryIso)
        .andWhere('gift_card_templates.status', giftCardTemplateStatus.ACTIVE)
        .andWhere(
          'gift_card_collections.status',
          giftCardCollectionStatus.ACTIVE
        )
        .groupByRaw('brands.id'),
      'name'
    );

    let appData = [];
    appData.push({
      collectionId: null,
      name: {
        en: 'Featured',
        ar: 'متميز',
      },
      brands: [],
      countryIso,
      type: giftCardSectionType.FEATURED,
      templatesTotalCount: 0,
    });

    if (isArray(brands) && brands.length > 0) {
      appData.push({
        collectionId: null,
        name: {
          en: 'Vendors',
          ar: 'الباعة',
        },
        brands,
        templates: [],
        type: giftCardSectionType.BRAND,
        templatesTotalCount: 0,
      });
    }

    appData.push(
      addLocalizationField(rsp, 'name')
        .map(collection => {
          return {
            ...collection,
            type: giftCardSectionType.GENERIC,
            collectionId: collection.id,
            brands: [],
            templatesTotalCount: templatesTotalCount[collection.id]
              ? templatesTotalCount[collection.id][0].count
              : 0,
          };
        })
        .filter(col => col.templatesTotalCount !== 0)
    );

    appData = appData.flat();

    return appData;
  }
  getAll(filters) {
    let query = super
      .getAll()
      .select(this.db.raw('gift_card_collections.*'))
      .orderBy('gift_card_collections.created', 'desc');
    if (filters) {
      query = this.filterGiftCardCollection(query, filters);
    }
    return query;
  }
  async getAllPaged(paging, filters) {
    if (!paging) paging = { offset: 0, limit: 9999 };
    const query = this.getAll(filters);
    const rsp = await new QueryHelper(query)
      .addPaging(paging)
      .addCounting()
      .resolvePagedQuery();
    rsp.items = addLocalizationField(rsp.items, 'name');
    return rsp;
  }

  async getForAppNew(countryId) {
    const templatesTotalCount = await this.db
      .select(
        this.db.raw(
          'gift_card_collections.id, count(1), gift_card_collections."name", gift_card_collections.name_ar, gift_card_collections.name_tr'
        )
      )
      .table('gift_card_templates')
      .join(
        'gift_card_collections',
        'gift_card_collections.id',
        'gift_card_templates.gift_card_collection_id'
      )
      .whereRaw(
        `(gift_card_templates.available_from is null or gift_card_templates.available_from < current_timestamp) and
           (gift_card_templates.available_until is null or gift_card_templates.available_until > current_timestamp)`
      )
      .where('gift_card_collections.country_id', countryId)
      .andWhere('gift_card_collections.status', giftCardCollectionStatus.ACTIVE)
      .andWhere('gift_card_templates.status', giftCardTemplateStatus.ACTIVE)
      .groupBy('gift_card_collections.id');

    const brands = addLocalizationField(
      await this.db
        .select(this.db.raw('brands.*'))
        .table('brands')
        .join(
          'gift_card_templates',
          'gift_card_templates.brand_id',
          'brands.id'
        )
        .join(
          'gift_card_collections',
          'gift_card_collections.id',
          'gift_card_templates.gift_card_collection_id'
        )
        .whereRaw(
          `(gift_card_templates.available_from is null or gift_card_templates.available_from < current_timestamp) and
           (gift_card_templates.available_until is null or gift_card_templates.available_until > current_timestamp)`
        )
        .where('gift_card_collections.country_id', countryId)
        .andWhere('gift_card_templates.status', giftCardTemplateStatus.ACTIVE)
        .andWhere(
          'gift_card_collections.status',
          giftCardCollectionStatus.ACTIVE
        )
        .groupByRaw('brands.id'),
      'name'
    );

    let appData = [];
    appData.push({
      collectionId: null,
      name: {
        en: 'Featured',
        ar: 'متميز',
      },
      brands: [],
      countryId,
      type: giftCardSectionType.FEATURED,
      templatesTotalCount: 0,
    });

    if (isArray(brands) && brands.length > 0) {
      appData.push({
        collectionId: null,
        name: {
          en: 'Vendors',
          ar: 'الباعة',
        },
        brands,
        templates: [],
        type: giftCardSectionType.BRAND,
        templatesTotalCount: 0,
      });
    }
    appData.push(
      addLocalizationField(templatesTotalCount, 'name')
        .map(collection => {
          return {
            ...collection,
            type: giftCardSectionType.GENERIC,
            collectionId: collection.id,
            brands: [],
            templatesTotalCount: collection.count ? collection.count : 0,
          };
        })
        .filter(col => col.templatesTotalCount !== 0)
    );

    appData = appData.flat();

    return appData;
  }

  async validate(giftCardCollectionInput) {
    const errors = [];

    const country = await this.context.country.getById(
      giftCardCollectionInput.countryId
    );

    if (!country) {
      errors.push(giftCardCollectionSaveError.INVALID_COUNTRY);
    } else if (!giftCardCollectionInput.name) {
      errors.push(giftCardCollectionSaveError.INVALID_COLLECTION_NAME);
    } else {
      const giftCardCollection = await this.db(this.tableName).select('*')
        .where('country_id', giftCardCollectionInput.countryId)
        .where('name', 'ilike', `${giftCardCollectionInput.name}`).first();
      if (giftCardCollection && (!giftCardCollectionInput.id || (giftCardCollectionInput.id && giftCardCollection.id !== giftCardCollectionInput.id))) {
        errors.push(giftCardCollectionSaveError.ALREADY_EXISTS);
      }
    }

    return errors;
  }
}

module.exports = GiftCardCollection;
