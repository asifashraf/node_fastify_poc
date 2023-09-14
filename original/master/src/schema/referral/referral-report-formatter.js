const { mapKeys, camelCase } = require('lodash');
const Transform = require('stream').Transform;
const moment = require('moment');
const { timezone } = require('../../../config');
const KD = require('../../lib/currency');

class ReferralReportFormatter extends Transform {
  constructor(options) {
    const withDefaults = {
      objectMode: true,
      ...(options || {}),
    };

    super(withDefaults);
  }
  _transform(rawRow, enc, next) {
    const row = mapKeys(rawRow, (v, k) => camelCase(k));
    const values = {
      ...row,
      senderName: (row.senderFirstName + ' ' + row.senderLastName).trim(),
      senderAmount: new KD(
        row.senderAmount,
        row.senderCurrencyDecimalPlace,
        row.senderCurrencyLowestDenomination
      ).value
        .toFixed(row.senderCurrencyDecimalPlace)
        .toString(),
      receiverName: (row.receiverFirstName + ' ' + row.receiverLastName).trim(),
      receiverAmount: new KD(
        row.receiverAmount,
        row.receiverCurrencyDecimalPlace,
        row.receiverCurrencyLowestDenomination
      ).value
        .toFixed(row.receiverCurrencyDecimalPlace)
        .toString(),
      joinedAt: row.joinedAt
        ? moment(row.joinedAt)
          .tz(timezone)
          .format('YYYY-MM-DD HH:mm:ss')
        : '',
      receivedAt: row.receivedAt
        ? moment(row.receivedAt)
          .tz(timezone)
          .format('YYYY-MM-DD HH:mm:ss')
        : '',
    };
    const formatted = {};

    mapKeys(ReferralReportFormatter.HEADERS, (header, rowAttr) => {
      formatted[header] = values[rowAttr];
    });

    this.push(formatted);

    next();
  }
}

ReferralReportFormatter.HEADERS = {
  senderName: 'Sender Name',
  senderReferralCode: 'Sender Referral Code',
  senderAmount: 'Sender Amount',
  senderCurrency: 'Sender Amount Currency',
  receiverName: 'Receiver Name',
  receiverAmount: 'Receiver Amount',
  receiverCurrency: 'Receiver Amount Currency',
  joinedAt: 'Date Joined',
  receivedAt: 'Date Order',
};

module.exports = ReferralReportFormatter;
