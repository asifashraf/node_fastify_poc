const {
  formatError,
} = require('../../lib/util');
const { saveSplashCategoryError } = require('./enums');

module.exports = {
  SplashCategory: {
    async contents({ id }, args, context) {
      return context.splashCategoryContent.getContentByFilters({ 'category_id': id });
    }
  },
  Mutation: {
    async saveSplashCategory(
      root,
      { input },
      context
    ) {
      const auth = context.auth;
      const admin = await context.admin.getByAuthoId(auth.id);
      if (admin && !auth.isVendorAdmin) {
        const { errors } = await context.splashCategory.validateInput(input);
        if (errors.length > 0) {
          return formatError(errors, input);
        }
        const id = await context.splashCategory.save(input);
        return { errors: null, category: await context.splashCategory.getById(id) };
      }
      return { errors: [saveSplashCategoryError.UNAUTHORIZED_PROCESS] };
    },
  },
  Query: {
    async getSplashCategories(
      root,
      { },
      context
    ) {
      return context.splashCategory.getAll();
    },
  },

};
