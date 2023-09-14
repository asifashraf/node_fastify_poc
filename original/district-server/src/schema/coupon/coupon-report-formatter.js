const { mapKeys, camelCase } = require('lodash');
const Transform = require('stream').Transform;
const moment = require('moment');
const { timezone } = require('../../../config');

class CouponReportFormatter extends Transform {
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
      createdAt: moment(row.createdAt)
        .tz(timezone)
        .format('YYYY-MM-DD HH:mm:ss'),
      startDate: moment(row.startDate)
        .tz(timezone)
        .format('YYYY-MM-DD HH:mm:ss'),
      endDate: moment(row.endDate)
        .tz(timezone)
        .format('YYYY-MM-DD HH:mm:ss'),
      redeemed: row.redemptionCount + ' / ' + row.redemptionLimit,
      status: row.isValid ? 'On' : 'Off',
    };

    const formatted = {};

    mapKeys(CouponReportFormatter.HEADERS, (header, rowAttr) => {
      formatted[header] = values[rowAttr];
    });

    this.push(formatted);

    next();
  }
}

CouponReportFormatter.HEADERS = {
  code: 'Code',
  amount: 'Amount',
  createdAt: 'Created On',
  startDate: 'Start Date',
  endDate: 'Expiration Date',
  status: 'Status',
  redeemed: 'Redeemed',
};

module.exports = CouponReportFormatter;
