const { formatError, addLocalizationField } = require('../../lib/util');
const { paymentStatusName, orderSetSource } = require('../root/enums');
const { assign } = require('lodash');
module.exports = {
  CSubscriptionOrder: {
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
    async customer({ customerId }, args, context) {
      return context.customer.getById(customerId);
    },
    async paymentMethod({ id }, args, context) {
      return context.cSubscriptionOrder.getPaymentMethod({ id });
    },
    async invoiceUrl({ id, countryId }, args, context) {
      return context.cSubscriptionOrder.getSubscriptionOrderInvoiceURL({ id, countryId });
    },
  },
  CSubscriptionCheckoutData: {
    async subscription({ invoice }, args, context) {
      if (invoice && invoice.subscription && invoice.subscription.id) {
        return context.cSubscription.getById(invoice.subscription.id);
      }
      return null;
    },
    autoRenewalStatus({ invoice }, args, context) {
      if (invoice && invoice.subscription && invoice.subscription.id) {
        return context.cSubscriptionCustomerAutoRenewal
          .getAutoRenewalStatusBySubscriptionId(invoice.subscription.id);
      }
      return null;
    },
    async termsAndConditions(root, args, context) {
      return {
        en: 'https://www.cofeapp.com/terms-and-conditions-users/?no-header-footer=true',
        ar: 'https://www.cofeapp.com/ar/terms-and-conditions-users/?no-header-footer=true',
        tr: 'https://www.cofeapp.com/terms-and-conditions-users/?no-header-footer=true',
      };
    },
    async checkoutLabels({ invoice }, args, context) {
      if (invoice && invoice.subscription) {
        const subscription = invoice.subscription;
        const brand = addLocalizationField(await context.brand.getById(subscription.brandId), 'name');
        const retVal = {};
        retVal.mainHeader = brand.name;
        retVal.productName = subscription.name;
        retVal.periodLabel = { en: subscription.period + ' days', ar: subscription.period + ' أيام ', tr: subscription.period + ' days' };
        return retVal;
      }
      return null;
    },
  },
  Mutation: {
    async subscriptionOrderCreate(root, { input }, context) {
      const subscriptionOrderObj = assign(input, {
        customerId: context.auth.id,
        src: input.src || orderSetSource.MOBILE,
        srcPlatform: context.req.xAppOs || null,
        srcPlatformVersion: context.req.xAppVersion || null,
        initialOrder: true,
      });

      // Check for initial validation errors
      const validationResult = await context.cSubscriptionOrder.validateOrder(
        subscriptionOrderObj,
      );

      if (validationResult.length > 0)
        return formatError(validationResult, subscriptionOrderObj);

      const result = await context.withTransaction(
        'cSubscriptionOrder',
        'create',
        subscriptionOrderObj,
      );
      if (result.error)
        return formatError(result, subscriptionOrderObj);

      switch (result.paymentStatus) {
        case paymentStatusName.PAYMENT_SUCCESS:
          await context.cSubscriptionOrder.paymentSuccess(input, result);
          break;
        case paymentStatusName.PAYMENT_FAILURE:
          await context.cSubscriptionOrder.paymentFailed(input, result);
      }

      return {
        subscriptionOrder: result.subscriptionOrder,
        paymentUrl: result.paymentUrl,
      };
    },
  },
  Query: {
    async fetchSubscriptionCheckoutData(root, { input }, context) {
      input.customerId = input.customerId ? input.customerId : context.auth.id;

      const validationResult = await context.cSubscriptionOrder.validateOrder(input, false);

      if (validationResult.length > 0)
        return formatError(validationResult, input);

      const invoice = await context.cSubscriptionOrder.getPricingCalculation(
        input,
      );

      return {
        invoice: Object.assign(invoice, { components: context.orderSet.componentArrangerForMobile(invoice.components) }),
      };
    },
    async getCSubscriptionOrdersWithFilters(root, { paging, filters }, context) {
      const admin = await context.admin.getByAuthoId(context.auth.id);
      if (admin) {
        if (!context.auth.isVendorAdmin) {
          return context.cSubscriptionOrder.getQueryByFilters(filters, paging);
        }
      } else {
        filters.customerId = context.auth.id;
        return context.cSubscriptionOrder.getQueryByFilters(filters, paging);
      }
      return [];
    },
    async subscriptionOrderAgain(root, { subscriptionCustomerId }, context) {
      const validationResult = await context.cSubscriptionOrder.validateOrderAgain(subscriptionCustomerId);
      if (validationResult.length > 0) return formatError(validationResult);
      return await context.cSubscriptionOrder.createSubscriptionOrderDeeplink(subscriptionCustomerId);
    },
    async checkSubscriptionCoupon(root, args, context) {
      return context.cSubscriptionOrder.checkCouponCode(root, args);
    }
  }
};
