const {
  formatError,
  addLocalizationField,
  addLocalizationMultipleFields,
  removeLocalizationMultipleFields,
} = require('../../lib/util');
const { cSubscriptionCustomerStatus } = require('../c-subscription-customer/enum');
const { contentCategoryStatus } = require('../common-content-category/enum');
const { contentStatus } = require('../common-content/enum');
const { badgeTypes } = require('../badge/enum');
const { map } = require('lodash');
const { cSubscriptionSaveError } = require('./enum');

module.exports = {
  Mutation: {
    async saveCSubscription(
      root,
      { subscription },
      context
    ) {
      const auth = context.auth;
      const admin = await context.admin.getByAuthoId(auth.id);
      if (admin && !context.auth.isVendorAdmin) {
        const { errors, input } = subscription.id ?
          await context.cSubscription.validateInputForOldSubscription(subscription) :
          await context.cSubscription.validateInputForNewSubscription(subscription);
        if (errors.length > 0) {
          return formatError(errors, subscription);
        }
        let formattedSubscription = input;
        formattedSubscription = removeLocalizationMultipleFields(formattedSubscription, ['name', 'description', 'imageUrl', 'iconUrl', 'shortDescription']);
        formattedSubscription.periodInMinutes = subscription.period * 1440;
        const id = await context.cSubscription.save(formattedSubscription);
        return { errors: null, subscription: await context.cSubscription.getById(id) };
      }
      return { errors: [cSubscriptionSaveError.UNAUTHORIZED_PROCESS] };
    },
  },
  Query: {
    async getCSubscriptionsByFilters(
      root,
      { paging, filters },
      context
    ) {
      return context.cSubscription.getQueryByFilters(filters, paging);
    },
    async getCSubscriptionTypes(root, args, context) {
      return context.cSubscription.subscriptionTypes();
    },
    getCSubscriptionBrands(root, args, context) {
      return context.cSubscription.getCSubscriptionBrands(args);
    },
    async getAvailableSortOrders(
      root,
      { brandId },
      context
    ) {
      const auth = context.auth;
      const admin = await context.admin.getByAuthoId(auth.id);
      if (admin && !context.auth.isVendorAdmin) {
        return context.cSubscription.getAvailableSortOrders(brandId);
      }
      return { errors: [cSubscriptionSaveError.UNAUTHORIZED_PROCESS] };
    },
  },
  CSubscription: {
    async brand({ brandId }, args, context) {
      const brand = await context.brand.getById(brandId);
      /**
       * TODO: it is required field but for now it is optional.
       * We will remove checks after clean inconsistent subscription data
       */
      if (brand) {
        return addLocalizationField(
          addLocalizationField(brand, 'name'),
          'brandDescription');
      }
      return null;
    },
    savedLabel({ compareAtPrice, price }, args, context) {
      const desc = {
        en: compareAtPrice - price,
        tr: compareAtPrice - price,
        ar: compareAtPrice - price,
      };
      return desc;
    },
    async vat({ countryId }, args, context) {
      const country = await context.country.getById(countryId);
      return country.vat;
    },
    async commonContents({ totalCupsCount, price, compareAtPrice, period, name, currencyId }, { slugs }, context) {
      const discountPrice = (compareAtPrice - price);
      const discountPercentage = parseInt((discountPrice * 100) / compareAtPrice).toString() + '%';
      let contentCategories = await context.commonContentCategory.getBySlugs(slugs, { status: contentCategoryStatus.ACTIVE });
      const { symbol } = addLocalizationField(await context.currency.selectFields(['symbol', 'symbol_ar', 'symbol_tr']).where('id', currencyId).first(), 'symbol');
      contentCategories = addLocalizationField(contentCategories, 'title');
      contentCategories = await Promise.all(
        contentCategories.map(async category => {
          let contents = await context.commonContent.getByFilters(
            {
              commonContentCategoryId: category.id,
              status: contentStatus.ACTIVE
            });
          contents = await Promise.all(
            map(contents, async content => {
              content.title = context.commonContent.getReplacedString(content.title, totalCupsCount, discountPrice, discountPercentage, name, period, price, symbol);
              content.description = context.commonContent.getReplacedString(content.description, totalCupsCount, discountPrice, discountPercentage, name, period, price, symbol);
              return content;
            })
          );
          category.commonContents = contents;
          return category;
        })
      );
      return contentCategories;
    },
    mostPopularDescription({ mostPopular }, args, context) {
      if (mostPopular) {
        const mostPopularDescription = { 'en': 'Most popular', 'ar': null };
        return mostPopularDescription;
      }
      return null;
    },
    async activePlan({ activePlan }, args, context) {
      if (activePlan) return activePlan;
      return false;
      /*
      const customerId = context.auth.id;
      if (customerId) {
        const subs = await context.cSubscriptionCustomer.getByCustomerIdAndSubscriptionId(customerId, id);
        if (subs && subs.status == cSubscriptionCustomerStatus.ACTIVE) {
          return true;
        }
      }
      */

    },
    async activePlanDescription({id, activePlan}, args, context) {
      if (activePlan) {
        const subs = await context.cSubscriptionCustomer
          .getByCustomerIdAndSubscriptionId(context.auth.id, id);
        if (subs && subs.status == cSubscriptionCustomerStatus.ACTIVE) {
          const latestTransaction = await context.cSubscriptionCustomerTransaction.getLatest(subs.id);
          if (latestTransaction.remainingCups === 0) {
            return { 'en': 'Fully redeemed', 'ar': 'تم الاستخدام بالكامل' };
          }
        }
        return { 'en': 'Active plan', 'ar': 'اشتراك فعّال' };
      }
      return null;
    },
    async badges({ mostPopular }, args, context) {
      if (!mostPopular) return null;
      //const badges = await context.badge.getBadgesByRelId(id, 'SUBSCRIPTION');
      const badges = await context.badge.getBadgesByTypes([badgeTypes.SUBSCRIPTION_MOST_POPULAR]);
      return addLocalizationMultipleFields(badges, ['name', 'text', 'iconUrl']);
    },
    async remainingCups({ id }, args, context) {
      const customerId = context.auth.id;
      if (customerId) {
        const subs = await context.cSubscriptionCustomer.getByCustomerIdAndSubscriptionId(customerId, id);
        if (subs && subs.status == cSubscriptionCustomerStatus.ACTIVE) {
          const latestTransaction = await context.cSubscriptionCustomerTransaction.getLatest(subs.id);
          return latestTransaction.remainingCups;
        }
      }
      return null;
    },
    async isRedeemed({id}, args, context) {
      const customerId = context.auth.id;
      if (customerId) {
        const subs = await context.cSubscriptionCustomer.getByCustomerIdAndSubscriptionId(customerId, id);
        if (subs && subs.status == cSubscriptionCustomerStatus.ACTIVE) {
          const latestTransaction = await context.cSubscriptionCustomerTransaction.getLatest(subs.id);
          return latestTransaction.remainingCups === 0;
        }
      }
      return false;
    },
    async subscriptionType({ subscriptionType }, args, context) {
      return context.cSubscription.subscriptionType(subscriptionType);
    },
    async autoRenewalStatus({id, activePlan}, args, context) {
      if (activePlan) {
        const subscriptionCustomer = await context.cSubscriptionCustomer
          .getByCustomerIdAndSubscriptionId(context.auth.id, id);
        return context.cSubscriptionCustomerAutoRenewal
          .getAutoRenewalStatusForSubscriptionCustomer(
            subscriptionCustomer
          );
      }
      return null;
    },
  },
};
