const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const QueryHelper = require('../../lib/query-helper');
const { addLocalizationField } = require('../../lib/util');
const { removeLocalizationField } = require('../../lib/util');
const { uuid } = require('../../lib/util');
const { giftCardTemplateSaveError, giftCardTemplateStatus } = require('../root/enums');
const moment = require('moment');

class GiftCardTemplate extends BaseModel {
  constructor(db, context) {
    super(db, 'gift_card_templates', context);
    this.loaders = createLoaders(this);
  }
  async validate({ availableFrom, availableUntil, percentPaidByCofe, percentPaidByVendor, brandIds, countryId }) {
    const errors = [];
    if (percentPaidByCofe + percentPaidByVendor !== 100) {
      errors.push(giftCardTemplateSaveError.INVALID_PAID_PERCENTAGE_SUM);
    }
    if (availableFrom && availableUntil && moment(availableFrom).isAfter(moment(availableUntil))) {
      errors.push(giftCardTemplateSaveError.INVALID_AVAILABLE_TIME);
    }
    if (brandIds) {
      const tempBrandIds = brandIds.filter((v, i, a) => a.indexOf(v) == i);
      const brands = await this.db('brands')
        .select('id')
        .where('country_id', countryId)
        .whereIn('id', tempBrandIds);
      if (tempBrandIds.length !== brands.length) {
        errors.push(giftCardTemplateSaveError.INVALID_BRAND_ID);
      }
    }
    return errors;
  }
  async save(input) {
    let giftCardTemplateId = '';
    if (input.id) {
      giftCardTemplateId = input.id;
      await this.db(this.tableName)
        .where('id', giftCardTemplateId)
        .update(
          removeLocalizationField(
            removeLocalizationField(input, 'imageUrl'),
            'name'
          )
        );
      await this.db
        .table('gift_card_templates_brands')
        .where(
          'gift_card_template_id',
          input.id
        )
        .delete();
      if ('brandIds' in input && input.brandIds.length > 0) {
        const addedValues = input.brandIds.map(brandId => {
          return { brandId, giftCardTemplateId: input.id };
        });
        await this.db.table('gift_card_templates_brands').insert(addedValues);
      }
    } else {
      giftCardTemplateId = uuid.get();
      input.id = giftCardTemplateId;
      await this.db(this.tableName).insert(
        removeLocalizationField(
          removeLocalizationField(input, 'imageUrl'),
          'name'
        )
      );
      if ('brandIds' in input && input.brandIds.length > 0) {
        const addedValues = input.brandIds.map(brandId => {
          return { brandId, giftCardTemplateId: input.id };
        });
        await this.db.table('gift_card_templates_brands').insert(addedValues);
      }
    }
    return giftCardTemplateId;
  }

  filterGiftCardTemplate(query, filters) {
    if (filters.status) {
      query.where('gift_card_templates.status', filters.status);
    } else {
      query.where('gift_card_templates.status', giftCardTemplateStatus.ACTIVE);
    }

    if (filters.countryId)
      query.where('gift_card_templates.country_id', filters.countryId);

    if (filters.countryId)
      query.where('gift_card_templates.country_id', filters.countryId);

    if (filters.collectionId)
      query.where(
        'gift_card_templates.gift_card_collection_id',
        filters.collectionId
      );

    if (filters.brandId) {
      query.whereRaw(`((gctbTemp.count is NOT NULL and gctb.brand_id = '${filters.brandId}') OR gctbTemp.count is NULL)`);
    }

    if (filters.currencyId)
      query.where('gift_card_templates.currency_id', filters.currencyId);

    if (filters.searchText) {
      filters.searchText = filters.searchText.toLowerCase().trim();
      query.whereRaw(
        '(LOWER(gift_card_templates.name) like ? or gift_card_templates.name_ar like ? or gift_card_templates.name_tr like ?)'
        , [`%${filters.searchText}%`, `%${filters.searchText}%`, `%${filters.searchText}%`],
      );
    }
    return query;
  }
  getAll(filters) {
    let query = super
      .getAll()
      .select(this.db.raw('gift_card_templates.*'))
      .joinRaw(`LEFT JOIN (SELECT count(*), gift_card_template_id from gift_card_templates_brands GROUP BY gift_card_template_id) as gctbTemp 
        ON gctbTemp.gift_card_template_id = gift_card_templates.id`)
      .leftJoin('gift_card_templates_brands as gctb', 'gctb.gift_card_template_id', 'gift_card_templates.id')
      .orderBy('gift_card_templates.created', 'desc');
    if (filters) {
      query = this.filterGiftCardTemplate(query, filters);
    }
    return query;
  }
  async getAllPaged(paging, filters) {
    const query = this.getAll(filters);
    const rsp = await new QueryHelper(query)
      //.addPaging(paging)
      .addCounting()
      .resolvePagedQuery();
    rsp.items = addLocalizationField(
      addLocalizationField(rsp.items, 'name'),
      'imageUrl'
    );
    return rsp;
  }

  incrementCount(id, field, count) {
    return this.db(this.tableName)
      .where({ id })
      .increment(field, count);
  }
  incrementPurchased(id, count) {
    return this.incrementCount(id, 'purchased_count', count);
  }
  incrementRedeemed(id, count) {
    return this.incrementCount(id, 'redeemed_count', count);
  }
}

module.exports = GiftCardTemplate;
