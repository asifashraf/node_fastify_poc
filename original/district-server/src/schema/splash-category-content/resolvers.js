const {
  formatError,
} = require('../../lib/util');
const { saveSplashCategoryError } = require('./enums');

module.exports = {
  Mutation: {
    async saveSplashCategoryContent(
      root,
      { input },
      context
    ) {
      const auth = context.auth;
      const admin = await context.admin.getByAuthoId(auth.id);
      if (admin && !auth.isVendorAdmin) {
        const { errors } = await context.splashCategoryContent.validateInput(input);
        if (errors.length > 0) {
          return formatError(errors, input);
        }
        await context.splashCategoryContent.save(input);
        return { errors: null, contents: await context.splashCategoryContent.getContentByFilters({ categoryId: input[0].categoryId }) };
      }
      return { errors: [saveSplashCategoryError.UNAUTHORIZED_PROCESS] };
    },
  },
  Query: {
    async checkSplash(
      root,
      { platform, language, size },
      context
    ) {
      return context.splashCategoryContent.getActiveSplashContent({ platform, language, size });
    },
  },

};
