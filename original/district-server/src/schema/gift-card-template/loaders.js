const DataLoader = require('dataloader');
const { map, groupBy } = require('lodash');
const { addLocalizationField } = require('../../lib/util');
const { giftCardTemplateStatus } = require('./../../../src/schema/root/enums');

function createLoaders(model) {
  return {
    giftCardCollection: new DataLoader(async giftCardCollectionsIds => {
      const giftCardTemplates = groupBy(
        addLocalizationField(
          addLocalizationField(
            await model
              .db('gift_card_templates')
              .whereIn('gift_card_collection_id', giftCardCollectionsIds)
              .orderBy('created', 'ASC'),
            'name'
          ),
          'imageUrl'
        ),
        'giftCardCollectionId'
      );
      return map(giftCardCollectionsIds, giftCardCollectionsId =>
        (giftCardTemplates[giftCardCollectionsId]
          ? giftCardTemplates[giftCardCollectionsId].slice(0, 5)
          : [])
      );
    }),
    giftCardCollectionApp: new DataLoader(async giftCardCollectionsIds => {
      const giftCardTemplates = groupBy(
        addLocalizationField(
          addLocalizationField(
            await model
              .db('gift_card_templates')
              .whereRaw(
                `(gift_card_templates.available_from is null or gift_card_templates.available_from < current_timestamp) and
                 (gift_card_templates.available_until is null or gift_card_templates.available_until > current_timestamp)`
              )
              .whereIn('gift_card_collection_id', giftCardCollectionsIds)
              .andWhere(
                'gift_card_templates.status',
                giftCardTemplateStatus.ACTIVE
              )
              .orderBy('created', 'ASC'),
            'name'
          ),
          'imageUrl'
        ),
        'giftCardCollectionId'
      );
      return map(giftCardCollectionsIds, giftCardCollectionsId =>
        (giftCardTemplates[giftCardCollectionsId]
          ? giftCardTemplates[giftCardCollectionsId].slice(0, 5)
          : [])
      );
    }),
    giftCardTemplate: new DataLoader(async giftCardTemplatesIds => {
      const giftCardCollections = groupBy(
        addLocalizationField(
          await model.db
            .table('gift_card_collections')
            .select(
              model.db.raw(
                'gift_card_collections.*, gift_card_templates.id as gift_card_template_id'
              )
            )
            .join(
              'gift_card_templates',
              'gift_card_templates.gift_card_collection_id',
              'gift_card_collections.id'
            )
            .whereIn('gift_card_templates.id', giftCardTemplatesIds)
            .orderBy('gift_card_collections.created', 'ASC'),
          'name'
        ),
        'giftCardTemplateId'
      );
      return map(giftCardTemplatesIds, giftCardTemplatesId =>
        (giftCardCollections[giftCardTemplatesId]
          ? giftCardCollections[giftCardTemplatesId][0]
          : null)
      );
    }),
    brand: new DataLoader(async giftCardTemplatesIds => {
      const brands = groupBy(
        addLocalizationField(
          await model.db
            .table('brands')
            .select(
              model.db.raw(
                'brands.*, gift_card_templates.id as gift_card_template_id'
              )
            )
            .join(
              'gift_card_templates',
              'gift_card_templates.brand_id',
              'brands.id'
            )
            .whereIn('gift_card_templates.id', giftCardTemplatesIds)
            .orderBy('brands.created', 'ASC'),
          'name'
        ),
        'giftCardTemplateId'
      );
      return map(giftCardTemplatesIds, giftCardTemplateId =>
        (brands[giftCardTemplateId] ? brands[giftCardTemplateId][0] : null)
      );
    }),
    brands: new DataLoader(async giftCardTemplatesIds => {
      const allBrandsStatuses = await model.db
        .table('gift_card_templates as gct')
        .select(
          model.db.raw(
            '(CASE WHEN count(*) > 1 THEN false ELSE true END) as all_brands, gct.id'
          )
        )
        .leftJoin('gift_card_templates_brands as gctb', 'gctb.gift_card_template_id', 'gct.id')
        .groupBy('gct.id')
        .whereIn('gct.id', giftCardTemplatesIds);

      const brandsWithNonSpecificGiftCardTemplates = await model.db.table('brands')
        .select(
          model.db.raw(
            'brands.*, gct.id as gift_card_template_id'
          )
        )
        .leftJoin('gift_card_templates as gct', 'gct.country_id', 'brands.country_id')
        .whereIn('gct.id',
          allBrandsStatuses.map(elem => {
            if (elem.allBrands) return elem.id;
          }).filter(n => n))
        .orderBy('brands.created', 'ASC');

      const brandsWithSpecificGiftCardTemplates = await model.db.table('brands')
        .select(
          model.db.raw(
            'brands.*, gctb.gift_card_template_id'
          )
        )
        .leftJoin(
          'gift_card_templates_brands as gctb',
          'gctb.brand_id',
          'brands.id'
        )
        .whereIn('gctb.gift_card_template_id',
          allBrandsStatuses.map(elem => {
            if (!elem.allBrands) return elem.id;
          }).filter(n => n))
        .orderBy('brands.created', 'ASC');


      const brands = groupBy(
        addLocalizationField(
          [...brandsWithNonSpecificGiftCardTemplates, ...brandsWithSpecificGiftCardTemplates].sort((a, b) => a.created - b.created),
          'name'
        ),
        'giftCardTemplateId'
      );
      return map(giftCardTemplatesIds, giftCardTemplateId =>
        (brands[giftCardTemplateId] ? brands[giftCardTemplateId] : null)
      );
    }),
    currency: new DataLoader(async giftCardTemplatesIds => {
      const currencies = groupBy(
        addLocalizationField(
          await model.db
            .table('currencies')
            .select(
              model.db.raw(
                'currencies.*, gift_card_templates.id as gift_card_templates_id'
              )
            )
            .join(
              'gift_card_templates',
              'gift_card_templates.currency_id',
              'currencies.id'
            )
            .whereIn('gift_card_templates.id', giftCardTemplatesIds),
          'symbol'
        ),
        'giftCardTemplatesId'
      );
      return map(giftCardTemplatesIds, giftCardTemplateId =>
        (currencies[giftCardTemplateId]
          ? currencies[giftCardTemplateId][0]
          : null)
      );
    }),
    country: new DataLoader(async giftCardTemplatesIds => {
      const countries = groupBy(
        addLocalizationField(
          await model.db
            .table('countries')
            .select(
              model.db.raw(
                'countries.*, gift_card_templates.id as gift_card_templates_id'
              )
            )
            .join(
              'gift_card_templates',
              'gift_card_templates.country_id',
              'countries.id'
            )
            .whereIn('gift_card_templates.id', giftCardTemplatesIds),
          'name'
        ),
        'giftCardTemplatesId'
      );
      return map(giftCardTemplatesIds, giftCardTemplateId =>
        (countries[giftCardTemplateId] ? countries[giftCardTemplateId][0] : null)
      );
    }),
  };
}

module.exports = { createLoaders };
