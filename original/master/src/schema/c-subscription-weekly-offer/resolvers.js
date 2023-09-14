const {
  formatError,
  removeLocalizationField,
} = require('../../lib/util');
const {cSubscriptionWeeklyOfferSaveError} = require('./enum');

module.exports = {
  Mutation: {
    async saveCSubscriptionWeeklyOffer(
      root,
      { subscriptionWeeklyOffer },
      context
    ) {
      const auth = context.auth;
      const admin = await context.admin.getByAuthoId(auth.id);
      if (admin && !auth.isVendorAdmin) {
        const { errors, input } = await context.cSubscriptionWeeklyOffer.validateInput(subscriptionWeeklyOffer);
        if (errors.length > 0) {
          return formatError(errors, subscriptionWeeklyOffer);
        }
        let formattedSubscription = input;
        formattedSubscription = removeLocalizationField(formattedSubscription, 'imageUrl');
        const id = await context.cSubscriptionWeeklyOffer.save(formattedSubscription);
        return { errors: null, subscriptionWeeklyOffer: await context.cSubscriptionWeeklyOffer.getById(id) };
      }
      return {errors: [cSubscriptionWeeklyOfferSaveError.UNAUTHORIZED_PROCESS]};
    },
  },
  Query: {
    async getCSubscriptionWeeklyOffersByFilters(
      root,
      { paging, filters },
      context
    ) {
      return context.cSubscriptionWeeklyOffer.getQueryByFilters(filters, paging);
    },
  },
};
