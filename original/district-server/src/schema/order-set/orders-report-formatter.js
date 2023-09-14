const { mapKeys, camelCase } = require('lodash');
const Transform = require('stream').Transform;
const moment = require('moment');
const KD = require('./../../lib/currency');

const { timezone } = require('../../../config');

class OrderReportFormatter extends Transform {
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

    if (row.orderPaymentMethod) {
      if (row.orderPaymentMethod.name) {
        row.paymentMethod = row.orderPaymentMethod.name.en;
      }
    }

    const couponAmount = row.couponAmount ? row.couponAmount : '0.000';
    const isCredits = parseFloat(row.credits ? row.credits : 0);
    const isGiftCard = parseFloat(
      row.giftcardcredits ? row.giftcardcredits : 0
    );
    const values = {
      ...row,
      internalComments: row.internalcomments,
      noOfOrdersPerBrand: row.noofordersperbrand,
      newCustomer: row.noofordersperbrand <= 1 ? 'Yes' : 'No',
      status: row.currentStatus,
      payment: row.paymentStatus,
      createdAt: moment(row.createdAt)
        .tz(timezone)
        .format('YYYY-MM-DD HH:mm:ss'),
      // .format(`Do MMM YYYY, h:mm a`),
      createdAt2: row.createdAt,
      brandShortAddress: row.brandShortAddress,
      brandLocationName: row.brandLocationName,
      items: row.items,
      subtotal: row.subtotal + row.currencyCode,
      couponAmount: '-' + couponAmount + row.currencyCode,
      total: row.total + row.currencyCode,
      compareAtPrice:
        (row.compareatprice ? row.compareatprice : '0.000') + row.currencyCode,
      amountDue: row.amountDue + row.currencyCode,
      credits:
        new KD(
          row.credits ? row.credits : '0.000',
          row.currencyDecimalPlace,
          row.currencyLowestDenomination
        ).toString() + row.currencyCode,
      giftCardCredits:
        new KD(
          row.giftcardcredits ? row.giftcardcredits : '0.000',
          row.currencyDecimalPlace,
          row.currencyLowestDenomination
        ).toString() + row.currencyCode,
      amountPaidCash:
        row.paymentMethod && row.paymentMethod.toUpperCase() === 'CASH'
          ? new KD(
            parseFloat(row.total) -
                parseFloat(row.credits ? row.credits : 0) -
                parseFloat(row.giftcardcredits ? row.giftcardcredits : 0),
            row.currencyDecimalPlace,
            row.currencyLowestDenomination
          ).toString() + row.currencyCode
          : '0',
      courierName: row.courierName ? row.courierName : 'N/A',
      expected: row.asap
        ? 'ASAP'
        : moment(row.fulfillmentTime)
          .tz(timezone)
          .format('h:mm a'),
      customerName: (
        (row.firstName ? row.firstName : '') +
        ' ' +
        (row.lastName ? row.lastName : '')
      ).trim(),
      email: row.email ? row.email : '',
      phoneNumber: row.phoneNumber,
      itemNames: row.itemnames ? row.itemnames.trim() : '',
      beans: row.beans ? row.beans : '0.000',
      perksRedeemed: row.perksredeemed ? row.perksredeemed.trim() : '',
      freeFood: row.freefood ? row.freefood.trim() : '',
      customerNeighborhoodName: row.customerNeighborhoodName
        ? row.customerNeighborhoodName.trim()
        : '',
      customerCityName: row.customerCityName ? row.customerCityName.trim() : '',
      rewardDiscountAmount:
        new KD(
          row.rewarddiscountamount ? row.rewarddiscountamount : '0.000',
          row.currencyDecimalPlace,
          row.currencyLowestDenomination
        ).toString() + row.currencyCode,
      freeItemAmount:
        new KD(
          row.freeitemamount ? row.freeitemamount : '0.000',
          row.currencyDecimalPlace,
          row.currencyLowestDenomination
        ).toString() + row.currencyCode,
      paymentMethod:
        (isCredits ? 'Credits' : '') +
        (isCredits && isGiftCard ? ' + ' : '') +
        (isGiftCard ? 'Gift Card' : '') +
        ((isCredits || isGiftCard) && row.paymentMethod ? ' + ' : '') +
        (row.paymentMethod ? row.paymentMethod : ''),
      amountPaidWithApplePay:
        row.paymentMethod === 'Apple Pay'
          ? new KD(
            parseFloat(row.total) -
                parseFloat(row.credits ? row.credits : 0) -
                parseFloat(row.giftcardcredits ? row.giftcardcredits : 0),
            row.currencyDecimalPlace,
            row.currencyLowestDenomination
          ).toString() + row.currencyCode
          : '0',
      amountPaidWithGooglePay:
        row.paymentMethod === 'Google Pay'
          ? new KD(
            parseFloat(row.total) -
                parseFloat(row.credits ? row.credits : 0) -
                parseFloat(row.giftcardcredits ? row.giftcardcredits : 0),
            row.currencyDecimalPlace,
            row.currencyLowestDenomination
          ).toString() + row.currencyCode
          : '0',
      amountPaidWithKNET:
        row.paymentMethod === 'KNET'
          ? new KD(
            parseFloat(row.total) -
                parseFloat(row.credits ? row.credits : 0) -
                parseFloat(row.giftcardcredits ? row.giftcardcredits : 0),
            row.currencyDecimalPlace,
            row.currencyLowestDenomination
          ).toString() + row.currencyCode
          : '0',
      amountPaidWithAMEX:
        row.paymentMethod === 'AMEX'
          ? new KD(
            parseFloat(row.total) -
                parseFloat(row.credits ? row.credits : 0) -
                parseFloat(row.giftcardcredits ? row.giftcardcredits : 0),
            row.currencyDecimalPlace,
            row.currencyLowestDenomination
          ).toString() + row.currencyCode
          : '0',
      amountPaidWithVISAMASTER:
        row.paymentMethod === 'VISA' ||
        row.paymentMethod === 'VISA/MASTER' ||
        row.paymentMethod === 'CARD' ||
        row.paymentMethod === 'SAVED_CARD' ||
        row.paymentMethod === 'Debit/Credit Cards' ||
        row.paymentMethod === 'Mastercard'
          ? new KD(
            parseFloat(row.total) -
                parseFloat(row.credits ? row.credits : 0) -
                parseFloat(row.giftcardcredits ? row.giftcardcredits : 0),
            row.currencyDecimalPlace,
            row.currencyLowestDenomination
          ).toString() + row.currencyCode
          : '0',
      amountPaidWithSTCPay:
        row.paymentMethod === 'STC Pay'
          ? new KD(
            parseFloat(row.total) -
                parseFloat(row.credits ? row.credits : 0) -
                parseFloat(row.giftcardcredits ? row.giftcardcredits : 0),
            row.currencyDecimalPlace,
            row.currencyLowestDenomination
          ).toString() + row.currencyCode
          : '0',
      amountPaidWithMADA:
        row.paymentMethod === 'MADA'
          ? new KD(
            parseFloat(row.total) -
                parseFloat(row.credits ? row.credits : 0) -
                parseFloat(row.giftcardcredits ? row.giftcardcredits : 0),
            row.currencyDecimalPlace,
            row.currencyLowestDenomination
          ).toString() + row.currencyCode
          : '0',
    };

    if (!values.paymentMethod) {
      row.paymentMethod = 'No Charge';
    }

    const formatted = {};

    mapKeys(OrderReportFormatter.HEADERS, (header, rowAttr) => {
      formatted[header] = values[rowAttr];
    });

    this.push(formatted);

    next();
  }
}

OrderReportFormatter.HEADERS = {
  id: 'OrderSetId',
  shortCode: 'ID',
  createdAt: 'Order Date',
  brandName: 'Brand Name',
  brandLocationName: 'Brand Location',
  neighborhoodName: 'Brand Neighborhood',
  cityName: 'Brand City',
  customerName: 'Customer Name',
  email: 'Customer Email',
  phoneNumber: 'Customer Phone',
  customerNeighborhoodName: 'Customer Neighborhood',
  customerCityName: 'Customer City',
  newCustomer: 'New Customer',
  type: 'Type',
  courierName: 'Courier',
  status: 'Status',
  expected: 'Expected',
  items: 'Items',
  itemNames: 'Item Names',
  couponCode: 'Voucher Code',
  couponAmount: 'Voucher',
  rewardDiscountAmount: 'Reward Discount',
  perksRedeemed: 'Free Items Redeemed',
  freeFood: 'Free Items (quantity)',
  freeItemAmount: 'Free Items Amount',
  beans: 'Beans Collected',
  fee: 'Service Fee (Delivery)',
  subtotal: 'Subtotal',
  total: 'Total',
  compareAtPrice: 'Compare At Price',
  amountDue: 'Amount Due',
  paymentMethod: 'Payment With',
  payment: 'Payment',
  credits: 'Amount Paid with Credits',
  giftCardCredits: 'Amount Paid with Gift Card',
  amountPaidCash: 'Amount Paid with Cash',
  amountPaidWithApplePay: 'Amount Paid With Apple Pay',
  amountPaidWithGooglePay: 'Amount Paid With Google Pay',
  amountPaidWithKNET: 'Amount Paid With KNET',
  amountPaidWithAMEX: 'Amount Paid With AMEX',
  amountPaidWithVISAMASTER: 'Amount Paid With Visa/Master',
  amountPaidWithSTCPay: 'Amount Paid With STC Pay',
  amountPaidWithMADA: 'Amount Paid With MADA',
  note: 'Customer Note',
  internalComments: 'Internal Notes',
};

module.exports = OrderReportFormatter;
