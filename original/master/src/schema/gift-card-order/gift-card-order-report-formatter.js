const { mapKeys, camelCase } = require('lodash');
const Transform = require('stream').Transform;
const moment = require('moment');

const { timezone } = require('../../../config');

class GiftCardOrderReportFormatter extends Transform {
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
    switch (row.paymentMethod) {
      case '1':
        row.paymentMethod = 'KNET';
        break;
      case '2':
        row.paymentMethod = 'VISA';
        break;
      case '3':
        row.paymentMethod = 'AMEX';
        break;
      case '12':
        row.paymentMethod = 'STC Pay';
        break;
      default:
        break;
    }
    const values = {
      ...row,
      anonymousSender: row.anonymousSender ? 'True' : 'False',
      customerName: (
        (row.firstName ? row.firstName : '') +
        ' ' +
        (row.lastName ? row.lastName : '')
      ).trim(),
      date: moment(row.created)
        .tz(timezone)
        .format('Do MMM YYYY, h:mm a'),
    };

    const formatted = {};

    mapKeys(GiftCardOrderReportFormatter.HEADERS, (header, rowAttr) => {
      formatted[header] = values[rowAttr];
    });

    this.push(formatted);

    next();
  }
}

GiftCardOrderReportFormatter.HEADERS = {
  shortCode: 'Short Code',

  amount: 'Amount',
  currencyName: 'Currency',
  templateName: 'Card Template',
  collectionName: 'Collection',
  customerName: 'Customer Name',
  deliveryMethod: 'Delivery Method',
  receiverEmail: 'Receiver Email',
  receiverPhoneNumber: 'Receiver Phone Number',
  anonymousSender: 'Anonymous Sender',
  date: 'Date',
};

module.exports = GiftCardOrderReportFormatter;
