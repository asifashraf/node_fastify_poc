/* eslint-disable camelcase */
const casual = require('casual');

const {
  paymentStatusOrderType,
  // paymentServices,
} = require('../../../src/schema/root/enums');

module.exports = (orderSets, loyaltyOrders) => {
  return [
    {
      id: casual.uuid,
      order_type: paymentStatusOrderType.LOYALTY_ORDER,
      reference_order_id: loyaltyOrders[0].id,
      // payment_service: paymentServices.MY_FATOORAH,
      payment_method: {
        id: '2',
        name: { ar: 'فيزا / ماستر', en: 'VISA/MASTER' },
        imageUrl:
          'https://cloudinary-cofeapp.s3.eu-west-1.amazonaws.com/payment-methods/Mastercard.png',
        currencyId: '',
        totalAmount: '10.000',
        directPayment: true,
        serviceCharge: '0.000',
        customerCardToken: {
          id: 'fcd9a8bb-df7f-4089-ab79-50b3be960a60',
          brand: 'MASTERCARD',
          token: '626d349bd7344e9198613841645496a3',
          issuer: 'BANCO DEL PICHINCHA, C.A.',
          number: '512345xxxxxx0008',
          expiryYear: 21,
          expiryMonth: 5,
        },
      },
    },
    {
      id: casual.uuid,
      order_type: paymentStatusOrderType.ORDER_SET,
      reference_order_id: orderSets[0].id,
      // payment_service: paymentServices.MY_FATOORAH,
      payment_method: {
        id: '2',
        name: { ar: 'فيزا / ماستر', en: 'VISA/MASTER' },
        imageUrl:
          'https://cloudinary-cofeapp.s3.eu-west-1.amazonaws.com/payment-methods/Mastercard.png',
        currencyId: '',
        totalAmount: '10.000',
        directPayment: true,
        serviceCharge: '0.000',
        customerCardToken: {
          id: 'fcd9a8bb-df7f-4089-ab79-50b3be960a60',
          brand: 'VISA',
          token: '626d349bd7344e9498613841645496a3',
          issuer: 'BANCO DEL PICHINCHA, C.A.',
          number: '512345xxxxxx0009',
          expiryYear: 21,
          expiryMonth: 5,
        },
      },
    },
  ];
};
