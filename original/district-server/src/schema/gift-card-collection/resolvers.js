const { addLocalizationField } = require('../../lib/util');
const { giftCardTemplateStatus } = require('./../../../src/schema/root/enums');
const { giftCardSectionType } = require('./../../../src/schema/root/enums');

module.exports = {
  GiftCardSection: {
    async templates({ id, type, countryIso }, args, context) {
      if (id)
        return context.giftCardTemplate.loaders.giftCardCollectionApp.load(id);
      if (type === giftCardSectionType.FEATURED) {
        return addLocalizationField(
          addLocalizationField(
            await context.db
              .select(context.db.raw('gift_card_templates.*'))
              .table('gift_card_templates')
              .join(
                'countries',
                'countries.id',
                'gift_card_templates.country_id'
              )
              .where('countries.iso_code', countryIso)
              .andWhere(
                'gift_card_templates.status',
                giftCardTemplateStatus.ACTIVE
              )
              .andWhere('gift_card_templates.is_featured', true),
            'name'
          ),
          'imageUrl'
        );
      }
      return [];
    },
    async templatesNew({ id, type, countryId }, args, context) {
      if (id)
        return context.giftCardTemplate.loaders.giftCardCollectionApp.load(id);
      if (type === giftCardSectionType.FEATURED) {
        return addLocalizationField(
          addLocalizationField(
            await context.db
              .select(context.db.raw('gift_card_templates.*'))
              .table('gift_card_templates')
              .where('gift_card_templates.country_id', countryId)
              .andWhere(
                'gift_card_templates.status',
                giftCardTemplateStatus.ACTIVE
              )
              .andWhere('gift_card_templates.is_featured', true),
            'name'
          ),
          'imageUrl'
        );
      }
      return [];
    },
  },
  GiftCardCollection: {
    async giftCardTemplates({ id }, args, context) {
      return context.giftCardTemplate.loaders.giftCardCollection.load(id);
    },
    async country({ id }, args, context) {
      return context.giftCardCollection.loaders.country.load(id);
    },
  },
};
