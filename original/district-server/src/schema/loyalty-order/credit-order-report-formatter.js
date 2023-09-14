const { mapKeys, camelCase, get } = require('lodash');
const Transform = require('stream').Transform;
const moment = require('moment');
const { timezone } = require('../../../config');

class CreditOrderReportFormatter extends Transform {
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

    let referenceId = null;
    // Wrap in try/catch in case rawResponse is not valid JSON
    try {
      referenceId = get(JSON.parse(row.paymentRawResponse), 'ref', 0);
    } catch (err) {
      console.log(err.message);
    }

    const values = {
      ...row,
      createdAt: moment(row.createdAt)
        .tz(timezone)
        .format('YYYY-MM-DD HH:mm:ss'),
      customerName: (
        (row.firstName ? row.firstName : '') +
        ' ' +
        (row.lastName ? row.lastName : '')
      ).trim(),
      referenceId,
    };

    const formatted = {};

    mapKeys(CreditOrderReportFormatter.HEADERS, (header, rowAttr) => {
      formatted[header] = values[rowAttr];
    });

    this.push(formatted);

    next();
  }
}

CreditOrderReportFormatter.HEADERS = {
  sku: 'SKU',
  createdAt: 'Date',
  amount: 'Amount',
  bonus: 'Bonus',
  customerName: 'Name',
  email: 'Email',
  merchantId: 'Merchant ID',
  referenceId: 'Reference ID',
  paymentMethod: 'Payment Method',
  paymentStatus: 'Payment Status',
  currencyName: 'Currency',
  loyaltyTierName: 'Loyalty Tier',
};

module.exports = CreditOrderReportFormatter;
