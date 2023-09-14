const { get } = require('lodash');
const { formatError } = require('../../lib/util');
// const { addLocalizationField } = require('../../lib/util');

module.exports = {
  PaymentMethod: {
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
  },
};
