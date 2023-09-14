const { updateCustomerStatusError } = require('../root/enums');

module.exports = {
  Mutation: {
    async authCustomerUpdateStatus(root, { customerId, active }, context) {
      try {
        const authCustomer = await context.authCustomer.getById(customerId);
        if (!authCustomer) {
          return {
            success: false,
            error: updateCustomerStatusError.INVALID_CUSTOMER_ID,
          };
        }
        await context.authCustomer.updateDisableStatus(customerId, !active);
        return {
          success: true,
          authCustomer,
        };
      } catch (err) {
        console.error('Error -> updateCustomerStatus', err);
        return {
          success: false,
          error: updateCustomerStatusError.SOMETHING_WENT_WRONG,
        };
      }
    },
  },
};
