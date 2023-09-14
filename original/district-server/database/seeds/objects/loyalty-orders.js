/* eslint-disable camelcase */
const casual = require('casual');
const times = require('lodash/times');
const { sample } = require('../utils.js');
const { loyaltyTierConfig } = require('../../../config');
module.exports = customers => {
  const loyaltyOrders = [];

  customers.forEach((customer, ix) => {
    if (ix === 0) {
      loyaltyOrders.push({
        id: casual.uuid,
        sku: 'TOPUP',
        amount: '10000',
        bonus: '0',
        customer_id: customer.id,
        currency_id: 'f216d955-0df1-475d-a9ec-08cb6c0f92bb',
      });
    }

    times(2, () => {
      const loyaltyTier = sample(loyaltyTierConfig);

      loyaltyOrders.push({
        id: casual.uuid,
        sku: loyaltyTier.sku,
        amount: loyaltyTier.amount,
        bonus: loyaltyTier.bonus,
        customer_id: customer.id,
        currency_id: 'f216d955-0df1-475d-a9ec-08cb6c0f92bb',
      });
    });
  });

  return loyaltyOrders;
};
