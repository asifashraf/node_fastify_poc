module.exports = {
  CustomerGroup: {
    async totalCustomers({ id }, args, context) {
      return context.customerGroup.loaders.totalCustomers.load(id);
      //const items = await context.customerGroup.getCustomersFromGroup(id);
      //return items ? items.length : 0;
    },
    customers({ id }, args, context) {
      return context.customerGroup.getCustomersFromGroup(id);
    },
  },
};
