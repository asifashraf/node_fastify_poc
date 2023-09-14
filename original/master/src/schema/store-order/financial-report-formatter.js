const { mapKeys, camelCase } = require('lodash');
const Transform = require('stream').Transform;
const moment = require('moment');

const { timezone } = require('../../../config');

class FinancialReportFormatter extends Transform {
  constructor(options) {
    const withDefaults = {
      objectMode: true,
      ...(options || {}),
    };

    super(withDefaults);
  }
  _transform(rawRow, enc, next) {
    const row = mapKeys(rawRow, (v, k) => camelCase(k));
    switch (row.storeOrderSetPaymentMethod) {
      case '1':
        row.storeOrderSetPaymentMethod = 'KNET';
        break;
      case '2':
        row.storeOrderSetPaymentMethod = 'VISA';
        break;
      case '3':
        row.storeOrderSetPaymentMethod = 'AMEX';
        break;
      case '12':
        row.storeOrderSetPaymentMethod = 'STC Pay';
        break;
      default:
        break;
    }
    const values = {
      ...row,
      customerName: (
        (row.firstName ? row.firstName : '') +
        ' ' +
        (row.lastName ? row.lastName : '')
      ).trim(),
      status: row.currentStatus,
      brandName: row.brandName,
      itemNames: row.itemnames ? row.itemnames.trim() : '',
      createdAt: moment(row.created)
        .tz(timezone)
        .format('Do MMM YYYY, h:mm a'),
      total: row.total + ' ' + row.currencyCode,
      payment: row.storeOrderSetPaymentMethod
        ? row.storeOrderSetPaymentMethod
        : 'KNET',
    };

    const formatted = {};

    mapKeys(FinancialReportFormatter.HEADERS, (header, rowAttr) => {
      formatted[header] = values[rowAttr];
    });

    this.push(formatted);

    next();
  }
}

FinancialReportFormatter.HEADERS = {
  storeOrderSetShortCode: 'Order Set ID',
  shortCode: 'ID',
  createdAt: 'Order Date',
  customerId: 'Customer ID',
  customerName: 'Customer Name',
  email: 'Customer Email',
  phoneNumber: 'Customer Phone',
  type: 'Type',
  status: 'Status',
  brandName: 'Brand',
  payment: 'Payment',
  total: 'Total',
  note: 'Customer Note',
  items: 'Items',
  itemNames: 'Item Names',
};

module.exports = FinancialReportFormatter;
