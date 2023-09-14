const { map, pick } = require('lodash');

const { addLocalizationField } = require('../../lib/util');

module.exports = {
  Coupon: {
    async brands({ id }, args, context) {
      return addLocalizationField(
        await context.coupon.getBrandsByCoupon(id),
        'name'
      );
    },
    async brandLocations({ id }, args, context) {
      return addLocalizationField(
        await context.coupon.getBrandLocationsByCoupon(id),
        'name'
      );
    },
    async country({ id }, args, context) {
      return addLocalizationField(
        await context.coupon.getCountryByCoupon(id),
        'name'
      );
    },
    customerGroup({ customerGroupId }, args, context) {
      return context.customerGroup.getById(customerGroupId);
    },
    async currency({ currencyId }, args, context) {
      return addLocalizationField(
        addLocalizationField(
          await context.currency.getById(currencyId),
          'symbol'
        ),
        'subunitName'
      );
    },
    couponDetails({ id }, args, context) {
      return context.couponDetail.getAllByCoupon(id);
    },
    async timeZoneIdentifier({ id }, args, context) {
      const country = await context.coupon.getCountryByCoupon(id);
      return country.timeZoneIdentifier;
    },
    async allowedCouponsTypes({ id }, args, context) {
      return context.couponDetail.allowedCouponTypes(id);
    },
    async customerIds({ customerGroupId }, args, context) {
      if (customerGroupId) {
        const customerIds = map(
          await context.customerGroup.getCustomerIdsFromGroup(customerGroupId),
          c => c.customerId
        );
        return customerIds;
      }

      return [];
    },
    async createdBy({ createdBy }, args, context) {
      return context.coupon.getUserSummaryById(createdBy);
    },
    async updatedBy({ updatedBy }, args, context) {
      return context.coupon.getUserSummaryById(updatedBy);
    },
    async totalCouponAmountUsedInOrders({ id }, args, context) {
      return context.coupon.getTotalCouponAmountUsedInOrders(id);
    },
    async orderDiscountStatus(root, args, context) {
      return pick(root, [
        'withReward',
        'withDiscoveryCredit',
      ]);
    },
  },
};
