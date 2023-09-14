module.exports = {
  MenuSection: {
    async items({ id }, args, context) {
      return context.menuSection.loaders.item.load(id);
    },
  },
};
