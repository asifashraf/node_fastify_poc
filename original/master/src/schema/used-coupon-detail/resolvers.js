module.exports = {
  UsedCouponDetail: {
    // we use this to send also a float number alongside amount of type CurrencyValue
    total({ amount }) {
      return amount;
    },
    coupon({ couponId }, args, context) {
      return context.coupon.getById(couponId);
    },
  },
};
