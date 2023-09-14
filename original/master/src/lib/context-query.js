const { cSubscriptionCustomerStatus } = require('./../schema/c-subscription-customer/enum');

const hasCustomerActiveCSubscription = userId => db => async ({ countryId, brandId, subscriptionId }) => {
  if (!userId)
    return false;
  let query = db('subscription_customers')
    .where('status', cSubscriptionCustomerStatus.ACTIVE)
    .andWhere('customer_id', userId);
  if (countryId) {
    query = query.andWhere('country_id', countryId);
  }
  if (brandId) {
    query = query.andWhere('brand_id', brandId);
  }
  if (subscriptionId) {
    query = query.andWhere('subscription_id', subscriptionId);
  }
  return ((await query) || []).length > 0;
};

module.exports = {
  hasCustomerActiveCSubscription,
};
