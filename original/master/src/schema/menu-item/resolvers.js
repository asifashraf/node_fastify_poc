const { formatError, addLocalizationField } = require('../../lib/util');
const { brandLocationUnavailableItemsError } = require('./enums');
module.exports = {
  Query: {
    async getBrandLocationSoldOutItems(_, { brandLocationId }, context) {
      // this query returns public information
      const brandLocation = await context.brandLocation.getById(
        brandLocationId
      );
      if (!brandLocation) {
        return formatError(
          [brandLocationUnavailableItemsError.BRAND_LOCATION_NOT_FOUND],
          brandLocationId
        );
      }
      const unavailableItems = addLocalizationField(
        addLocalizationField(
          await context.menuItem.getSoldOutItemsByBrandLocationId(
            brandLocationId
          ),
          'name'
        ),
        'itemDescription'
      );
      return { items: unavailableItems };
    },
  },
  MenuItem: {
    baseNutritional({ baseNutritionalId }, args, context) {
      return context.nutritionalInfo.getById(baseNutritionalId);
    },
    async optionSets({ id }, args, context) {
      return context.menuItem.loaders.optionSet.load(id);
    },
    async section({ sectionId }, args, context) {
      return addLocalizationField(
        await context.menuSection.getById(sectionId),
        'name'
      );
    },
    available({ id }, { brandLocationId }, context) {
      return context.menuItem.getAvailability(id, brandLocationId);
    },
    unavailableState({ id }, { brandLocationId }, context) {
      return context.menuItem.getUnavailabilityState(id, brandLocationId);
    },
    async tags({ id }, args, context) {
      return context.tagRelation.getTagsByRelId(id);
    },
    async isSubscribable({ id }, args, context) {
      const subscriptionMenuItems = await context.cSubscriptionMenuItem.getQueryByFilters({ menuItemId: id }, null);
      if (subscriptionMenuItems && subscriptionMenuItems.length > 0) {
        return false;
      }
      return true;
    }
  },
};
