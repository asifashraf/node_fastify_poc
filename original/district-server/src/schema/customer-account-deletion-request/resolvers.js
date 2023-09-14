const { formatError } = require('../../lib/util');

module.exports = {
  Mutation: {
    async requestAccountDeletion(_, { input }, context) {
      const validationResult = await context
        .customerAccountDeletionRequest
        .validate(input);

      if (validationResult.length > 0) {
        return {
          result: false,
          ...formatError(validationResult)
        };
      }

      return context.withTransaction(
        'customerAccountDeletionRequest',
        'save',
        input,
      );
    },
  },
  // Query: {
  //   async requestOTPForAccountDeletion(root, args, context) {
  //     const { phoneNumber } = await context.customer
  //       .selectFields(['phone_number'])
  //       .where('id', context.auth.id)
  //       .first();
  //     return context.authService.requestPhoneOTP(phoneNumber, false);
  //   }
  // }
};
