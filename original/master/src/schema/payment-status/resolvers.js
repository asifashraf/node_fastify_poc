const { property } = require('lodash');

module.exports = {
  PaymentStatus: {
    datetime: property('createdAt'),
  },
};
