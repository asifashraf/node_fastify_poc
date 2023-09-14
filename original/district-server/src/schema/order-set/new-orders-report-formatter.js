const { mapKeys, camelCase } = require('lodash');
const Transform = require('stream').Transform;
const moment = require('moment');
const { timezone } = require('../../../config');

class NewOrderReportFormatter extends Transform {
  constructor(options) {
    const withDefaults = {
      objectMode: true,
      ...(options || {}),
    };

    super(withDefaults);
  }
  // eslint-disable-next-line complexity
  _transform(rawRow, enc, next) {
    const row = mapKeys(rawRow, (v, k) => camelCase(k));

    const values = {
      ...row,
      orderDate: moment(row.orderDate)
        .tz(timezone)
        .format('YYYY-MM-DDTHH:mm:ss.SSS'),
    };

    const formatted = {};

    mapKeys(NewOrderReportFormatter.HEADERS, (header, rowAttr) => {
      formatted[header] = values[rowAttr];
    });

    this.push(formatted);

    next();
  }
}

NewOrderReportFormatter.HEADERS = {
  orderDate: 'Order Date',
  orderShortId: 'ID',
  orderId: 'OrderSetId',
  customerId: 'Customer ID',
  customerName: 'Customer Name',
  customerSurname: 'Customer Surname',
  brand: 'Brand Name',
  branch: 'Branch Name',
  isoCode: 'ISO Code',
  currentStatus: 'Current Status',
  orderType: 'Order Type',
  paymentMethod: 'Payment Method',
  paymentProvider: 'Payment Provider',
  courierName: 'Courier Name',
  partnerReferenceId: 'Partner Reference Id',
  itemList: 'Item List',
  sumItemQuantity: 'Sum Item Quantity',
  sumFreeItemQuantity: 'Sum Free Item Quantity',
  subtotal: 'Subtotal',
  serviceFee: 'Service Fee',
  creditsUsed: 'Credits Used',
  discoveryCreditUsed: 'Discovery Credit Used',
  giftCards: 'Gift Cards',
  rewardAmount: 'Reward Amount',
  couponAmount: 'Coupon Amount',
  couponCode: 'Coupon Code',
  amountToBePaid: 'Amount To Be Paid',
  internalNotes: 'Internal Notes'

};

module.exports = NewOrderReportFormatter;
