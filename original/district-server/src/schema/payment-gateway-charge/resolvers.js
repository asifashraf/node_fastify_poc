const { addLocalizationField, formatError } = require('../../lib/util');

module.exports = {
  Mutation: {
    async savePaymentGatewayCharge(root, { input }, context) {
      // Check for initial validation errors
      const validationResult = await context.paymentGatewayCharge.validate(
        input
      );

      if (validationResult.length > 0)
        return {
          success: false,
          ...formatError(validationResult, input),
        };

      const id = await context.paymentGatewayCharge.save(input);

      return {
        success: true,
        paymentGatewayCharge: await context.paymentGatewayCharge.getById(id),
      };
    },
    async deletePaymentGatewayCharge(root, { id }, context) {
      const deletedPaymentGatewayCharge = await context.paymentGatewayCharge.deletePaymentGatewayCharge(
        id
      );
      return deletedPaymentGatewayCharge;
    },
  },
  Query: {
    paymentGatewayCharge(root, { id }, context) {
      return context.paymentGatewayCharge.getById(id);
    },
    // paymentGatewayCharges(root, args, context) {
    //   return context.paymentGatewayCharge.searchWithName(
    //     args.searchTerm,
    //     args.countryId,
    //     args.paging
    //   );
    // },
  },
  PaymentGatewayCharge: {
    async country({ countryId }, args, context) {
      return addLocalizationField(
        await context.country.getById(countryId),
        'name'
      );
    },
  },
};
