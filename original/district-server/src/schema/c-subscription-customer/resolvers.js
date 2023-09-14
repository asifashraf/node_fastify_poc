const {
  addLocalizationField,
} = require('../../lib/util');
const {
  cSubscriptionCustomerStatus
} = require('./enum');
module.exports = {
  Mutation: {
  },
  Query: {
    async getCSubscriptionCustomer(root, { }, context) {
      const customerId = context.auth.id;
      const subs = await context.cSubscriptionCustomer.getByCustomerId(customerId);
      return subs;
    },
    async getCSubscriptionCustomerOverview(root, { countryId }, context) {
      const result = {};
      const customerId = context.auth.id;
      const { subscriptionInfo } = await context.cSubscriptionCustomer.getCSubscriptionCustomerOverview(
        countryId,
        customerId,
      );
      const totalSaving = await context.cSubscriptionCustomer.calculateTotalSaving(customerId, countryId);
      subscriptionInfo.totalSavings = totalSaving;
      result.subscriptionInfo = subscriptionInfo;
      return result;
    },
    async getCSubscriptionCustomerListing(root, { filters, paging, countryId }, context) {
      const auth = context.auth;
      const admin = await context.admin.getByAuthoId(auth.id);
      if (admin && !auth.isVendorAdmin) {
        const cSubscriptionCustomers = await context.cSubscriptionCustomer.getCSubscriptionCustomerListing(countryId, filters, paging);
        return cSubscriptionCustomers;
      }
      return null;
    },
    async getCSubscriptionCustomerDetail(root, { subscriptionCustomerId }, context) {
      const auth = context.auth;
      const admin = await context.admin.getByAuthoId(auth.id);
      if (admin && !auth.isVendorAdmin) {
        const cSubscriptionCustomers = await context.cSubscriptionCustomer.getCSubscriptionCustomerDetail(subscriptionCustomerId);
        return cSubscriptionCustomers;
      }
      return null;
    },
    async checkSubscriptionStatusForOrderSet(root, { orderSetId }, context) {
      const auth = context.auth;
      const admin = await context.admin.getByAuthoId(auth.id);
      if (admin && !auth.isVendorAdmin) {
        return context.cSubscriptionCustomer
          .checkSubscriptionStatusForOrderSet(orderSetId);
      }
      return null;
    },
    async getCSubscriptionCustomerHistory(root, { countryId }, context) {
      const customerId = context.auth.id;
      const status = cSubscriptionCustomerStatus.INACTIVE;
      const {subscriptionInfo} = await context.cSubscriptionCustomer.getCSubscriptionCustomerOverview(
        countryId,
        customerId,
        status
      );
      const totalSaving = await context.cSubscriptionCustomer.calculateTotalSaving(customerId, countryId);
      subscriptionInfo.totalSavings = totalSaving;
      return {subscriptionInfo};
    },
  },
  CSubscriptionCustomer: {
    async subscription({ subscriptionId }, args, context) {
      return context.cSubscription.getById(subscriptionId);
    }
  },
  CSubscriptionCustomerDetail: {
    async subscription({ subscriptionId }, args, context) {
      return context.cSubscription.getById(subscriptionId);
    },
    async subscriptionCustomer({ subscriptionCustomerId }, args, context) {
      return context.cSubscriptionCustomer.getById(subscriptionCustomerId);
    },
    async invoiceUrl({ subscriptionOrderId, countryId }, args, context) {
      let url = await context.cSubscriptionOrder.getSubscriptionOrderInvoiceURL({ id: subscriptionOrderId, countryId });
      if (!url) {
        url = `https://www.cofeapp.com?sId=${subscriptionOrderId}`;
      }
      return url;
    },
    async brand({ brandId }, args, context) {
      return addLocalizationField(await context.brand.getById(brandId), 'name');
    },
    isRedeemed(subscriptionCustomerOverview, args, context) {
      return subscriptionCustomerOverview.remainingCups === 0;
    },
    autoRenewalStatus(subscriptionCustomerOverview, args, context) {
      return context.cSubscriptionCustomerAutoRenewal
        .getAutoRenewalStatusForSubscriptionCustomer(
          subscriptionCustomerOverview
        );
    },
    async redeemedCupsCount({ remainingCups, totalCupsCount, status, subscriptionCustomerId }, args, context) {
      if (status == cSubscriptionCustomerStatus.ACTIVE) {
        return totalCupsCount - remainingCups;
      } else {
        const lastTrx = await context.cSubscriptionCustomerTransaction.getSecondLatest(subscriptionCustomerId);
        return totalCupsCount - lastTrx.remainingCups;
      }
    },
    async totalSaving({ remainingCups, subscriptionId, status, subscriptionCustomerId, currencyId, countryId }, args, context) {
      const country = await context.country.getById(countryId);
      const currency = await context.currency.getById(currencyId);
      if (status == cSubscriptionCustomerStatus.ACTIVE) {
        return await context.cSubscriptionCustomer.calculateTotalSavingBySubscriptionId(subscriptionId, remainingCups, currency, country, subscriptionCustomerId);
      } else {
        const lastTrx = await context.cSubscriptionCustomerTransaction.getSecondLatest(subscriptionCustomerId);
        return await context.cSubscriptionCustomer.calculateTotalSavingBySubscriptionId(subscriptionId, lastTrx.remainingCups, currency, country, subscriptionCustomerId);
      }
    }
  },
  CSubscriptionCustomerAdmin: {
    async subscription({ subscriptionId }, args, context) {
      return context.cSubscription.getById(subscriptionId);
    },
    async subscriptionOrder({ subscriptionOrderId }, args, context) {
      return context.cSubscriptionOrder.getById(subscriptionOrderId);
    },
    async usedCupsNumber({ id }, args, context) {
      const orderNumbers = await context.cSubscriptionCustomerTransaction.getUsedCupNumbers([id]);
      if (orderNumbers.length > 0) {
        return orderNumbers[0].count;
      } return 0;
    },
    async renewedCount({customerId, subscriptionId}, args, context) {
      return await context.cSubscriptionCustomer.renewedSubscriptionCount(customerId, subscriptionId);
    }
  }
};
