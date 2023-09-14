module.exports = {
  CouponDetail: {
    // we use this to send also a float number alongside amount of type CurrencyValue
    total({ amount }) {
      return amount;
    },
  },
};
