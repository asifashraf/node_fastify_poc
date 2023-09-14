const { mapKeys, camelCase } = require('lodash');
const Transform = require('stream').Transform;
const moment = require('moment');

const { timezone } = require('../../../config');

class CustomerReportFormatter extends Transform {
  constructor(options) {
    const withDefaults = {
      objectMode: true,
      ...(options || {}),
    };

    super(withDefaults);
  }
  _transform(rawRow, enc, next) {
    const row = mapKeys(rawRow, (v, k) => camelCase(k));
    // console.log('row', row);
    const values = {
      ...row,
      lastOrderSetDate: row.lastordersetdate
        ? moment(row.lastordersetdate)
          .tz(timezone)
          .format('Do MMM YYYY, h:mm a')
        : '',
    };

    const formatted = {};

    mapKeys(CustomerReportFormatter.HEADERS, (header, rowAttr) => {
      formatted[header] = values[rowAttr];
    });

    this.push(formatted);

    next();
  }
}

CustomerReportFormatter.HEADERS = {
  id: 'Customer ID',
  firstName: 'First Name',
  lastName: 'Last Name',
  email: 'Email',
  phoneNumber: 'Phone',
  // loyaltyTier: 'Tier',
  creditbalance: 'Credit Balance',
  totalkdspent: 'Total KD Spent',
  lastOrderSetDate: 'Last Order Date',
  countryname: 'Country',
  countryphone: 'Country Phone',
  usedperks: 'Used Perks',
  availableperks: 'Available Perks',
};

module.exports = CustomerReportFormatter;
