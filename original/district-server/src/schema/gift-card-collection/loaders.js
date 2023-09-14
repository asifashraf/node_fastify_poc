const DataLoader = require('dataloader');
const { map, groupBy } = require('lodash');
const { addLocalizationField } = require('../../lib/util');

function createLoaders(model) {
  return {
    brand: new DataLoader(async giftCardCollectionsIds => {
      const brands = groupBy(
        addLocalizationField(
          await model.db
            .table('brands')
            .select(
              model.db.raw(
                'brands.*, gift_card_templates.gift_card_collection_id'
              )
            )
            .join(
              'gift_card_templates',
              'gift_card_templates.brand_id',
              'brands.id'
            )
            .whereIn(
              'gift_card_templates.gift_card_collection_id',
              giftCardCollectionsIds
            )
            .orderBy('brands.created', 'ASC'),
          'name'
        ),
        'giftCardCollectionId'
      );
      return map(giftCardCollectionsIds, giftCardCollectionsId =>
        (brands[giftCardCollectionsId]
          ? brands[giftCardCollectionsId].reduce((a, v) => {
            if (!a.find(b => b.id === v.id)) a.push(v);
            return a;
          }, [])
          : [])
      );
    }),
    country: new DataLoader(async giftCardCollectionsIds => {
      const countries = groupBy(
        addLocalizationField(
          await model.db
            .table('countries')
            .select(
              model.db.raw(
                'countries.*, gift_card_collections.id as gift_card_collection_id'
              )
            )
            .join(
              'gift_card_collections',
              'gift_card_collections.country_id',
              'countries.id'
            )
            .whereIn('gift_card_collections.id', giftCardCollectionsIds),
          'name'
        ),
        'giftCardCollectionId'
      );
      return map(giftCardCollectionsIds, giftCardCollectionsId =>
        (countries[giftCardCollectionsId]
          ? countries[giftCardCollectionsId][0]
          : null)
      );
    }),
  };
}

module.exports = { createLoaders };
