// const { includes, first, map } = require('lodash');
// const { Checkout } = require('checkout-sdk-node');
//
// const {
//   paymentProvider,
//   orderPaymentMethods,
//   paymentMethodSourceType,
//   paymentStatusName,
// } = require('../../schema/root/enums');
// const { transformToCamelCase } = require('../../lib/util');
// const { checkoutCom } = require('../../../config');
//
// const cko = new Checkout(checkoutCom.secretKey);
//
// function badParameter(param) {
//   throw new Error(`${param} is invalid`);
// }
//
// function badResponse(param) {
//   throw new Error(`${param} was not received from Checkout`);
// }
//
// function formatCurrency(code) {
//   let precision = 2;
//   switch (true) {
//     case includes(['BHD', 'LYD', 'JOD', 'KWD', 'OMR', 'TND'], code):
//       precision = 3;
//       break;
//     case includes(
//       [
//         'BIF',
//         'DJF',
//         'GNF',
//         'ISK',
//         'KMF',
//         'XAF',
//         'CLF',
//         'XPF',
//         'JPY',
//         'PYG',
//         'RWF',
//         'KRW',
//         'VUV',
//         'VND',
//         'XOF',
//       ],
//       code
//     ):
//       precision = 1;
//       break;
//     default:
//       precision = 2;
//   }
//
//   return amount => {
//     return Number(amount) * Math.pow(10, precision);
//   };
// }
// function makeCkoService(context) {
//   return {
//     getConfig() {
//       return { publicKey: checkoutCom.publicKey };
//     },
//     async getPaymentMethods({ customerId }) {
//       const paymentMethods = [];
//
//       const cardTokens = await context.customerCardToken.getAllByCustomerAndProvider(
//         customerId,
//         paymentProvider.CHECKOUT
//       );
//
//       // paymentMethods.push({
//       //   id: orderPaymentMethods.PAYMENT_PROVIDER_TOKEN,
//       //   name: 'APPLE PAY',
//       //   nameAr: 'APPLE Pay',
//       // });
//
//       map(cardTokens, customerCardToken => {
//         paymentMethods.push({
//           id: orderPaymentMethods.CARD,
//           name: 'CARD',
//           nameAr: 'كي نت',
//           customerCardToken,
//           source: {
//             type: paymentMethodSourceType.SAVED_CUSTOMER_CARD_TOKEN,
//             id: customerCardToken.id,
//           },
//           subText: `**** **** **** ${customerCardToken.last4}`,
//         });
//       });
//
//       paymentMethods.push({
//         id: 'ADD_CC',
//         identifier: 'ADD_CC',
//         name: 'Add Credit Card',
//         nameAr: 'اضافة بطاقة ائتمان',
//       });
//
//       return paymentMethods;
//     },
//     async getCustomerSavedCardTokens(customerId) {
//       return context.customerCardToken.getAllByCustomerAndProvider(
//         customerId,
//         paymentProvider.CHECKOUT
//       );
//     },
//     async pay(data) {
//       const response = {
//         id: null,
//         error: null,
//         rawResponse: null,
//         paymentUrl: null,
//         approved: false,
//       };
//       try {
//         const rawResponse = await this.processPayment(data);
//         response.id = rawResponse.id;
//         response.approved = rawResponse.approved || false;
//         response.rawResponse = rawResponse;
//         if (rawResponse.requiresRedirect) {
//           response.paymentUrl = rawResponse.redirectLink;
//         }
//       } catch (err) {
//         console.log(err);
//         response.error = err;
//       }
//
//       return response;
//     },
//     async processPayment(data) {
//       const {
//         token,
//         amount,
//         currency,
//         customerId,
//         reference,
//         successUrl,
//         failureUrl,
//       } = data;
//       if (!token) badParameter('token');
//       if (!amount && amount !== 0) badParameter('amount');
//       if (!currency) badParameter('currency');
//       if (!customerId) badParameter('customerId');
//
//       const currencyAmount = formatCurrency(currency)(amount);
//       const checkoutCustomer = await context
//         .db('checkout_customers')
//         .where('customer_id', customerId)
//         .then(transformToCamelCase)
//         .then(first);
//       const body = {
//         currency,
//         amount: currencyAmount,
//         reference,
//       };
//
//       switch (true) {
//         case /^(card_tok)_([0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12})$/.test(
//           token
//         ):
//           body.source = { token };
//           break;
//         case /^(tok)_(\w{26})$/.test(token):
//           body.source = { token };
//           break;
//         case /^(src)_(\w{26})$/.test(token):
//           body.source = { id: token };
//           break;
//         case /^(cus)_(\w{26})$/.test(token):
//           body.source = { id: token };
//           break;
//         default:
//           break;
//       }
//
//       if (checkoutCustomer) {
//         body.customer = { id: checkoutCustomer.customerToken };
//       }
//       if (reference) {
//         body.reference = reference;
//       }
//       if (successUrl) {
//         // eslint-disable-next-line camelcase
//         body.success_url = successUrl;
//       }
//       if (failureUrl) {
//         // eslint-disable-next-line camelcase
//         body.failure_url = failureUrl;
//       }
//       if (amount > 0) {
//         body['3ds'] = { enabled: true };
//       }
//
//       const ckoResponse = await cko.payments.request(body);
//       if (
//         !checkoutCustomer &&
//         ckoResponse &&
//         ckoResponse.customer &&
//         ckoResponse.customer.id
//       ) {
//         await context.db('checkout_customers').insert({
//           // eslint-disable-next-line camelcase
//           customer_id: customerId,
//           // eslint-disable-next-line camelcase
//           customer_token: ckoResponse.customer.id,
//         });
//       }
//       return ckoResponse;
//     },
//     async saveCardToken(data) {
//       const { token, customerId } = data;
//       if (!token) badParameter('token');
//       if (!customerId) badParameter('customerId');
//
//       const response = await this.verifyCard(data);
//       return this.saveCard({
//         data: response,
//         customerId,
//       });
//     },
//     async verifyCard({ token, customerId }) {
//       return this.processPayment({
//         token,
//         customerId,
//         amount: 0,
//         currency: 'GBP',
//       });
//     },
//     async saveCard({ data, customerId }) {
//       const { source, customer } = data;
//       if (!source || !source.id) badResponse('source');
//       if (!customer || !customer.id) badResponse('customer');
//
//       const providerSource = first(transformToCamelCase([source]));
//
//       const cardToken = {
//         type: providerSource.type,
//         expiryMonth: providerSource.expiryMonth,
//         expiryYear: providerSource.expiryYear,
//         name: providerSource.name,
//         scheme: providerSource.scheme,
//         last4: providerSource.last4,
//         bin: providerSource.bin,
//         cardType: providerSource.cardType,
//         cardCategory: providerSource.cardCategory,
//         issuer: providerSource.issuer,
//         issuerCountry: providerSource.issuerCountry,
//         productId: providerSource.productId,
//         productType: providerSource.productType,
//         customerId,
//         customerToken: customer.id,
//         sourceToken: source.id,
//         providerRaw: JSON.stringify(data),
//         paymentProvider: paymentProvider.CHECKOUT,
//       };
//
//       const existingCardTokens = await context.customerCardToken.getAllByCustomer(
//         customerId
//       );
//       if (existingCardTokens.length === 0) {
//         cardToken.isDefault = true;
//       }
//
//       return context.customerCardToken.save(cardToken);
//     },
//     async paymentStatus({ id }) {
//       const response = {
//         id: null,
//         referenceOrderId: null,
//         paymentStatus: paymentStatusName.PAYMENT_PENDING,
//         orderType: null,
//         rawResponse: null,
//         error: null,
//       };
//       try {
//         const rawResponse = await cko.payments.get(id);
//         response.id = rawResponse.id;
//         // rawResponse.reference = ORDER_SET#49613224-3450-4996-9c71-a1449a2c1f6a
//         const reference = String(rawResponse.reference).split('#');
//         response.referenceOrderId = reference[1] || null;
//         response.orderType = reference[0] || null;
//         response.rawResponse = rawResponse;
//         response.paymentStatus = rawResponse.approved
//           ? paymentStatusName.PAYMENT_SUCCESS
//           : paymentStatusName.PAYMENT_FAILURE;
//       } catch (err) {
//         console.log(err);
//         response.error = err;
//       }
//
//       return response;
//     },
//   };
// }
//
// module.exports = makeCkoService;
