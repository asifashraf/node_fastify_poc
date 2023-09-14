const { addLocalizationField } = require('../../lib/util');
const { GiftCardByOrderIdError } = require('./enums');

module.exports = {
  Mutation: {
    async giftCardCreateBulk(root, { giftCardCreateBulkInput }, context) {
      const errors = await context.giftCard.validateCreateBulk(giftCardCreateBulkInput);
      if (errors.length > 0) {
        return {errors, shortCodes: null};
      }
      const shortCodes = await context.giftCard.createBulk(giftCardCreateBulkInput);
      return {errors: null, shortCodes };
    },
  },
  Query: {
    async getAvailableGiftCards(
      root,
      { currencyCode, brandLocationId },
      context
    ) {
      const customerId = context.auth.id;
      const currency = await context.currency.getByCode(currencyCode);
      const currencyId = currency ? currency.id : null;
      const brandLocation = await context.brandLocation.getById(
        brandLocationId
      );
      const brandId = brandLocation ? brandLocation.brandId : null;
      return addLocalizationField(
        addLocalizationField(
          await context.giftCard.getCustomerAvailableGiftCards({
            customerId,
            brandId,
            currencyId,
          }),
          'imageUrl'
        ),
        'name'
      );
    },
    async getGiftCardByOrderId(root, { giftCardOrderId }, context) {
      if (await context.giftCardOrder
        .checkIfGiftCardOrderBelongsToUser(context.auth.id, giftCardOrderId)) {
        const giftCard = context.giftCard.getGiftCardByOrderId(giftCardOrderId);
        if (giftCard === null) {
          return {
            giftCard: null,
            error: GiftCardByOrderIdError.NOT_CREATED_YET
          };
        }

        return {
          giftCard,
          error: null
        };
      }
      return {
        giftCard: null,
        error: GiftCardByOrderIdError.UNAUTHORIZED
      };
    }
  },
  GiftCard: {
    giftCardOrder: ({ id }, args, context) =>
      context.giftCard.loaders.giftCardOrder.load(id),
    giftCardTemplate: ({ id }, args, context) =>
      context.giftCard.loaders.giftCardTemplate.load(id),
    sender: ({ id }, args, context) => context.giftCard.loaders.sender.load(id),
    receiver: ({ id }, args, context) =>
      context.giftCard.loaders.receiver.load(id),
    async currency({ currencyId }, args, context) {
      return addLocalizationField(
        addLocalizationField(
          await context.currency.getById(currencyId),
          'symbol'
        ),
        'subunitName'
      );
    },
    async country({ countryId }, args, context) {
      return addLocalizationField(
        await context.country.getById(countryId),
        'name'
      );
    },
    transactions: ({ id }, args, context) =>
      context.giftCard.loaders.transactions.load(id),
    async brand({ brandId }, args, context) {
      return addLocalizationField(
        addLocalizationField(await context.brand.getById(brandId), 'name'),
        'brandDescription'
      );
    },
  },
};
