const { mapKeys, camelCase } = require('lodash');
const Transform = require('stream').Transform;
const moment = require('moment');
const KD = require('./../../lib/currency');

const { timezone } = require('../../../config');

class FinancialReportFormatter extends Transform {
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
      customerName: (
        (row.firstName ? row.firstName : '') +
        ' ' +
        (row.lastName ? row.lastName : '')
      ).trim(),
      status: row.currentStatus,
      brandName: row.brandName,
      createdAt: moment(row.createdAt)
        .tz(timezone)
        .format('Do MMM YYYY, h:mm a'),
      deliveryAddressNeighborhoodName: row.deliveryAddressNeighborhoodName,
      subtotal: row.subtotal + row.currencyCode,
      couponAmount: '-' + couponAmount + row.currencyCode,
      refundedItems: row.refundeditems ? row.refundeditems : 0,
      refundedCredits: new KD(
        row.refundedcredits ? row.refundedcredits : '0.000',
        row.currencyDecimalPlace,
        row.currencyLowestDenomination
      ).toString(),
      refundedGiftCardCredits: new KD(
        row.refundedgiftcardcredits ? row.refundedgiftcardcredits : '0.000',
        row.currencyDecimalPlace,
        row.currencyLowestDenomination
      ).toString(),
      rewardDiscountAmount:
        new KD(
          row.rewarddiscountamount ? row.rewarddiscountamount : '0.000',
          row.currencyDecimalPlace,
          row.currencyLowestDenomination
        ).toString() + row.currencyCode,
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
      payment:
        (isCredits ? 'Credits' : '') +
        (isCredits && isGiftCard ? ' + ' : '') +
        (isGiftCard ? 'Gift Card' : '') +
        ((isCredits || isGiftCard) && row.paymentMethod ? ' + ' : '') +
        (row.paymentMethod ? row.paymentMethod : ''),
    };

    if (!values.paymentMethod) {
      row.paymentMethod = 'No Charge';
    }

    const formatted = {};

    mapKeys(FinancialReportFormatter.HEADERS, (header, rowAttr) => {
      formatted[header] = values[rowAttr];
    });

    this.push(formatted);

    next();
  }
}

FinancialReportFormatter.HEADERS = {
  id: 'OrderSetId',
  shortCode: 'ID',
  createdAt: 'Order Date',
  customerId: 'Customer ID',
  customerName: 'Customer Name',
  email: 'Customer Email',
  phoneNumber: 'Customer Phone',
  newCustomer: 'New Customer',
  type: 'Type',
  status: 'Status',
  brandName: 'Brand',
  deliveryAddressNeighborhoodName: 'Area',
  couponCode: 'Voucher Code',
  couponAmount: 'Voucher',
  rewardDiscountAmount: 'Reward Discount Amount',
  fee: 'Delivery Fee',
  subtotal: 'Subtotal',
  total: 'Total',
  compareAtPrice: 'Compare At Price',
  amountDue: 'Amount Due',
  payment: 'Payment With',
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
  refundedItems: 'Refunded Items',
  refundedCredits: 'Refunded Credits',
  refundedGiftCardCredits: 'Refunded Gift Card Credits',
  note: 'Customer Note',
  internalComments: 'Internal Notes',
};

module.exports = FinancialReportFormatter;
