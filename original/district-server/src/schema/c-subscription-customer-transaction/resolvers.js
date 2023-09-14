const { addLocalizationField } = require('../../lib/util');
const { cSubscriptionReferenceOrderType } = require('./enum');

module.exports = {
  Mutation: {
  },
  Query: {
    async getAllSubscriptionUsage(root, { countryId, subscriptionId }, context) {
      const customerId = context.auth.id;
      const subsInfoList = [];
      let allSubs = null;
      if (subscriptionId) {
        allSubs = await context.cSubscriptionCustomer.getAllSubscriptions(customerId, countryId, subscriptionId);
      } else {
        allSubs = await context.cSubscriptionCustomer.getAllSubscriptions(customerId, countryId);
      }
      if (allSubs && allSubs.length != 0) {
        for (const subs of allSubs) {
          const subsInfo = {};
          subsInfo.usage = await context.cSubscriptionCustomerTransaction.getAllSubscriptionTransactions(subs.id);
          subsInfo.overview = await context.cSubscriptionCustomer.getOverview(subs);
          subsInfoList.push(subsInfo);
        }
      }
      return subsInfoList;
    },
  },
  CSubscriptionCustomerTransaction: {
    async brand({ brandId }, args, context) {
      const brand = await context.brand.getById(brandId);
      return addLocalizationField(brand, 'name');
    },
    async branch({ branchId }, args, context) {
      const branch = await context.brandLocation.getById(branchId);
      return addLocalizationField(branch, 'name');
    },
    async title({ subscriptionId, brandId, referenceOrderType }, args, context) {
      if (referenceOrderType == cSubscriptionReferenceOrderType.SUBSCRIPTION_ORDER) {
        const subs = await context.cSubscription.getById(subscriptionId);
        return subs.name;
      } else if (referenceOrderType == cSubscriptionReferenceOrderType.ORDER_SET) {
        const brand = addLocalizationField(await context.brand.getById(brandId), 'name');
        return brand.name;
      }
    },
    async subtitle({ subscriptionId, branchId, referenceOrderType }, args, context) {
      if (referenceOrderType == cSubscriptionReferenceOrderType.ORDER_SET) {
        const branch = addLocalizationField(await context.brandLocation.getById(branchId), 'name');
        return branch.name;
      }
      return null;
    },
    usageDate({ created }, args, context) {
      return created;
    },
    usageCount({ credit, debit }, args, context) {
      if (credit == 0 && debit != 0) {
        return 0 - debit;
      } else if (credit != 0 && debit == 0) {
        return credit;
      }
    }
  },
};
