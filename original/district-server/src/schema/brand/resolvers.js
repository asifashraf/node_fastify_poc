const { addLocalizationField, formatError } = require('../../lib/util');
const { brandLocationStatus } = require('./../root/enums');
const {
  branchToggleError,
  branchToggleStatus,
  branchStatusCountError,
} = require('./enums');
const { map } = require('lodash');
const { cSubscriptionTypes } = require('../c-subscription/enum');
// const { cSubscriptionBrandStatus } = require('../c-subscription-brand/enum');

module.exports = {
  Brand: {
    async locations(
      { id },
      { location, filters = { status: brandLocationStatus.ACTIVE } },
      context
    ) {
      return context.brand.loaders.location.load(id, location, filters);
    },
    async primaryLocation({ primaryLocationId }, args, context) {
      return addLocalizationField(
        await context.brandLocation.getById(primaryLocationId),
        'name'
      );
    },
    menu({ id }, { countryId }, context) {
      return context.menu.getByBrandAndCountry(id, countryId);
    },
    storeOrders({ id }, args, context) {
      return context.storeOrder.getAllByBrand(id);
    },
    async country({ countryId }, args, context) {
      return addLocalizationField(
        await context.country.getById(countryId),
        'name'
      );
    },
    menus({ id }, args, context) {
      return context.menu.getAllByBrand(id);
    },
    async brandAdmins({ id }, args, context) {
      return context.brandAdmin.getByBrandAndBrandLocationId(id, null);
    },
    coupons({ id }, { paging, countryId }, context) {
      return context.coupon.getByBrand(id, paging, countryId);
    },
    async rewards({ id }, args, context) {
      return addLocalizationField(
        addLocalizationField(await context.reward.getByBrandId(id), 'title'),
        'conversionName'
      );
    },
    async couponsCount({ id, countryId }, args, context) {
      return context.coupon.getCountByBrandAndCountry(id, countryId);
    },
    currentCommissionModel({ id }, args, context) {
      return context.brandCommissionModel.getCurrentBrandModel(id);
    },
    applicableDiscoveryCredit({ id, countryId }, args, context) {
      const customerId = context.auth.id;
      return context.discoveryCredit.applicableDiscoveryCredit({
        brandId: id,
        countryId,
        customerId,
      });
    },
    discoveryCreditAvailable({ id, countryId }, args, context) {
      const customerId = context.auth.id;
      return context.discoveryCreditRedemption.discoveryCreditAvailable({
        brandId: id,
        countryId,
        customerId,
      });
    },
    orderRatingScore({ id }, args, context) {
      return context.orderRating.getBrandScore(id);
    },
    async subscribable({ id, countryId }, args, context) {
      const customerId = context.auth.id;
      if (customerId) {
        /**
         * TODO: write a new function with customer id and brand id to get subscription customers
         */
        const subscriptionId = await context.cSubscriptionCustomer.getLastActiveSubscriptionId(customerId, countryId);
        if (!subscriptionId) {
          return false;
        }
        /*
        const query = await context.roDb('subscription_brands')
          .where('subscription_id', subscriptionId)
          .andWhere('brand_id', id)
          .andWhere('status', cSubscriptionBrandStatus.ACTIVE);
        if (query && query.length > 0) {
          return true;
        }
        */
      }
      return false;
    },
    async subscribableBadgeUrl({ subscriptionType }, args, context) {
      const subscriptionTypeRes = await context.cSubscription.subscriptionType(subscriptionType);
      return {
        en: subscriptionTypeRes.iconPath,
        ar: subscriptionTypeRes.iconPathAr,
        tr: subscriptionTypeRes.iconPathTr,
      };
    },
    async isSubscriptionAvailable({ id, countryId }, args, context) {
      const subsAvailableForCountry = await context.cSubscription.isSubscriptionEnableByCountryId(countryId);
      if (!subsAvailableForCountry) {
        return false;
      }
      const availableSubs = await context.cSubscription.getSubscriptionByBrandId(id);
      if (availableSubs && availableSubs.length > 0) {
        return true;
      }
      return false;
    },
    async subscriptionTypeIconUrl({ id, countryId }, args, context) {
      const subsAvailableForCountry = await context.cSubscription.isSubscriptionEnableByCountryId(countryId);
      if (!subsAvailableForCountry) {
        return null;
      }
      const availableSubs = await context.cSubscription.getSubscriptionByBrandId(id);
      if (availableSubs && availableSubs.length > 0) {
        const subsTypes = map(availableSubs, subs => subs.subscriptionType);
        let details = null;
        if (subsTypes.includes(cSubscriptionTypes.CUP)) {
          details = await context.cSubscription.subscriptionType(cSubscriptionTypes.CUP);
        } else {
          details = await context.cSubscription.subscriptionType(cSubscriptionTypes.BUNDLE);
        }
        return details.iconPath ? details.iconPath : null;
      }
      return null;
    },
    async availableSubscriptions({ id, countryId }, args, context) {
      const subsAvailableForCountry = await context.cSubscription.isSubscriptionEnableByCountryId(countryId);
      if (!subsAvailableForCountry) {
        return null;
      }
      const availableSubs = await context.cSubscription.getSubscriptionByBrandId(id);
      if (availableSubs && availableSubs.length > 0) {
        return addLocalizationField(availableSubs, 'name');
      }
      return null;
    },
    async brandDescription(root, args, context) {
      return (typeof root.brandDescription === 'string')
        ? {
          en: (root.brandDescription || '').trim(),
          ar: root.brandDescriptionAr,
          tr: root.brandDescriptionTr,
        }
        : (root.brandDescription instanceof Object && 'en' in root.brandDescription)
          ? {
            en: (root.brandDescription.en || '').trim(),
            ar: root.brandDescription.ar,
            tr: root.brandDescription.tr,
          }
          : {};
    },
  },
  Mutation: {
    async toggleAllBranches(_, { toggleInput }, context) {
      const brand = await context.brand.getById(toggleInput.brandId);
      if (!brand) {
        return formatError([branchToggleError.BRAND_NOT_FOUND], toggleInput);
      }
      const branches = await context.brandLocation.getByBrandId(
        toggleInput.brandId
      );
      if (!branches || branches.length === 0) {
        return formatError(
          [branchToggleError.NO_BRANCHES_FOR_BRAND_FOUND],
          toggleInput
        );
      }
      const toggleStatus = toggleInput.status === branchToggleStatus.ON;
      const updatedBranchCount = await context.brandLocation.setBrandLocationAcceptingOrdersByBrandId(
        toggleInput.brandId,
        toggleStatus
      );
      console.log('Updated Branches Count : ', updatedBranchCount);
      return {
        updatedBranchCount,
      };
    },
  },
  Query: {
    async viewBranchesStatusCount(_, { brandId }, context) {
      const brand = await context.brand.getById(brandId);
      if (!brand) {
        return formatError([branchStatusCountError.BRAND_NOT_FOUND], brandId);
      }
      const branches = await context.brandLocation.getByBrandId(brandId);
      if (!branches || branches.length === 0) {
        return formatError(
          [branchToggleError.NO_BRANCHES_FOR_BRAND_FOUND],
          brandId
        );
      }
      const countResults = await context.brandLocation.getBrandLocationAcceptingOrdersStatusByBrandId(
        brandId
      );
      const onlineResult = countResults.find(
        element => Boolean(element.acceptingOrders) === true
      );
      const offlineResult = countResults.find(
        element => Boolean(element.acceptingOrders) === false
      );
      return {
        offlineBranchCount: offlineResult ? offlineResult.count : 0,
        onlineBranchCount: onlineResult ? onlineResult.count : 0,
      };
    },
  },
};
