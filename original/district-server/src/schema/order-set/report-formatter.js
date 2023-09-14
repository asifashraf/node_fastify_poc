const { mapKeys, camelCase } = require('lodash');
const Transform = require('stream').Transform;

const paymentType = ({ cashOnDelivery, creditsUsed }) => {
  if (cashOnDelivery) {
    return 'CASH';
  }

  if (creditsUsed) {
    return 'LOYALTY';
  }

  return 'KNET';
};

class ReportFormatter extends Transform {
  constructor(options) {
    const withDefaults = {
      objectMode: true,
      ...(options || {}),
    };

    super(withDefaults);
  }
  _transform(rawRow, enc, next) {
    const row = mapKeys(rawRow, (v, k) => camelCase(k));
    let couponAmount = row.couponAmount;

    if (row.couponPercentage) {
      const amountOff = row.total * 0.01 * row.couponPercentage;
      couponAmount = row.total - amountOff;
    }

    const values = {
      ...row,
      customerName: `${row.firstName} ${row.lastName}`,
      locationName: `${row.brandName} ${row.shortAddress}`,
      expected: row.asap || row.fulfillmentTime,
      area: row.brandNeighborhood || row.deliveryNeighborhood,
      voucherCode: row.couponCode,
      voucher: couponAmount,
      payment: paymentType(row),
    };

    const formatted = {};

    mapKeys(ReportFormatter.HEADERS, (header, rowAttr) => {
      formatted[header] = values[rowAttr];
    });

    this.push(formatted);

    next();
  }
}

ReportFormatter.HEADERS = {
  shortCode: 'ID',
  createdAt: 'Order Date',
  customerName: 'Name',
  type: 'Type',
  status: 'Status',
  brandName: 'Brand',
  locationName: 'Location',
  area: 'Area',
  payment: 'Payment',
  voucherCode: 'Voucher Code',
  voucher: 'Voucher',
  subtotal: 'Subtotal',
  total: 'Total',
  fee: 'Delivery Fee',
  expected: 'Fulfillment Time',
  itemCount: 'Item Count',
};

module.exports = ReportFormatter;
