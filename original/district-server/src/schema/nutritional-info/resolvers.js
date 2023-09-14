module.exports = {
  NutritionalInfo: {
    allergens({ id }, args, context) {
      return context.nutritionalInfo.getAllergensByNutritionalInfo(id);
    },
  },
};
