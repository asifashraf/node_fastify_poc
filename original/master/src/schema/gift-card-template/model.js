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
  validate({ availableFrom, availableUntil, percentPaidByCofe, percentPaidByVendor }) {
    const errors = [];
    if (percentPaidByCofe + percentPaidByVendor !== 100) {
      errors.push(giftCardTemplateSaveError.INVALID_PAID_PERCENTAGE_SUM);
    }
    if (availableFrom && availableUntil && moment(availableFrom).isAfter(moment(availableUntil))) {
      errors.push(giftCardTemplateSaveError.INVALID_AVAILABLE_TIME);
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
    } else {
      giftCardTemplateId = uuid.get();
      input.id = giftCardTemplateId;
      await this.db(this.tableName).insert(
        removeLocalizationField(
          removeLocalizationField(input, 'imageUrl'),
          'name'
        )
      );
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

    if (filters.brandId)
      query.where('gift_card_templates.brand_id', filters.brandId);

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
