const { get } = require('lodash');
const { formatError } = require('../../lib/util');
const { paymentSchemes } = require('../../payment-service/enums');
// const { addLocalizationField } = require('../../lib/util');

module.exports = {
  PaymentMethod: {
    isDefault({paymentScheme}, args, context) {
      if (paymentScheme == paymentSchemes.APPLE_PAY) {
        const { clientOs } = context.internalAuthService.getDeviceInformation();
        return clientOs == 'ios';
      }
      return false;
    }
    // async currency({ currencyId, currency }, args, context) {
    //   if (currency) {
    //     return currency;
    //   }
    //   return addLocalizationField(
    //     addLocalizationField(
    //       await context.currency.getById(currencyId),
    //       'symbol'
    //     ),
    //     'subunitName'
    //   );
    // },
  },
  Query: {
    async getPaymentMethods(
      root,
      { countryCode, brandLocationId, fulfillment, includeCash },
      context
    ) {
      const customerId = get(context.auth, 'id', null);
      const paymentMethods = await context.paymentService.getPaymentMethods({
        countryCode,
        brandLocationId,
        customerId,
        fulfillment,
        includeCash,
      });
      if (paymentMethods.errors) {
        console.log('Payment Methods error : ', paymentMethods.errors);
        return [];
      }
      return paymentMethods;
    },
    async getPaymentProviderConfig(root, { countryCode, provider }, context) {
      const config = await context.paymentService.getConfig(
        provider,
        countryCode
      );
      if (config.error) {
        return formatError([config.error], {
          query: 'getPaymentProviderConfig',
          params: { countryCode },
        });
      }
      return config;
    },
    async getPaymentProvidersForAdmin(
      root,
      { status, countryId},
      context
    ) {
      return await context.paymentMethod.getPaymentProviders({status, countryId});
    },
    async getPaymentMethodsForAdmin(
      root,
      { status, countryId},
      context
    ) {
      return await context.paymentMethod.getPaymentMethodsForAdmin({status, countryId});
    },
    async getAvailablePaymentMethodOptionsForAdmin(
      root,
      {countryId},
      context
    ) {
      return await context.paymentMethod.getAvailablePaymentMethodOptionsForAdmin(countryId);
    }
  },
  Mutation: {
    async updatePaymentProviderStatus(
      root,
      { input },
      context
    ) {
      const validationResult = await context.paymentMethod.validateProvider(input);
      if (validationResult.length > 0) {
        return formatError(validationResult, input);
      }
      const result = await context.withTransaction('paymentMethod', 'updateProviderStatus', input);
      if (result.errors) {
        return formatError(result, input);
      }
      return { paymentProvider: result };
    },
    async savePaymentMethodsByProvider(
      root,
      { input },
      context
    ) {
      const validationResult = await context.paymentMethod.validatePaymentMethods(input);
      if (validationResult.length > 0) {
        return formatError(validationResult, input);
      }
      const result = await context.withTransaction('paymentMethod', 'saveMethods', input);
      if (result.errors) {
        return formatError(result, input);
      }
      return { paymentMethods: result };
    },
  },
};
