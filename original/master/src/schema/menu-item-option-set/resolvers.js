module.exports = {
  MenuItemOptionSet: {
    async options({ id }, args, context) {
      return context.menuItemOptionSet.loaders.option.load(id);
    },
  },
};
