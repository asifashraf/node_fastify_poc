module.exports = {
  MenuSection: {
    async items({ id }, args, context, info) {
      const result = await context.menuSection.loaders.item.load(id);
      if (info?.variableValues?.menuItemType) {
        return result.filter(item => item.type == info?.variableValues?.menuItemType);
      } else {
        return result;
      }
    },
  },
};
