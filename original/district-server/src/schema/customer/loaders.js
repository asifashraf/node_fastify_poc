const DataLoader = require('dataloader');
const { map } = require('lodash');
const axios = require('axios');
const path = require('path');
const { authServiceUrl } = require('../../../config');

function createLoaders(model) {
  return {
    customerOTPLockdownStatus: new DataLoader(async customerPhoneNumbers => {
      try {
        const fullUrl = new URL(path.join('customerOTPLockDownStatus'), authServiceUrl).toString();
        const res = await axios.post(fullUrl, JSON.stringify(customerPhoneNumbers), {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        const { data } = res;
        if (data) {
          return map(customerPhoneNumbers, customerPhoneNumber => data[customerPhoneNumber]);
        }
        throw new Error('Unhandled exception!');
      } catch (e) {
        // if there will be any error, the flow should be completed so that's why lockedDown:true
        return map(customerPhoneNumbers, customerPhoneNumber => {
          return {
            'hitCount': -1,
            'lockedDown': true
          };
        });
      }
    }),
  };
}

module.exports = { createLoaders };
