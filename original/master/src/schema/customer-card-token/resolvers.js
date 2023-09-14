module.exports = {
  CustomerCardToken: {
    customer({ customerId }, args, context) {
      return context.customer.getById(customerId);
    },
  },
};
