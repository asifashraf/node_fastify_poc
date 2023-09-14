// const { includes, omit } = require('lodash');
//
// const {
//   paymentProvider,
//   // orderPaymentMethods,
//   paymentMethodSourceType,
// } = require('../schema/root/enums');
// const { buildAbsoluteUrl } = require('../lib/util');
// const { availablePaymentServices } = require('../../config');
// const makeCkoService = require('./checkout-com');
// const makeMfService = require('./my-fatoorah');
//
// function makePaymentService(context) {
//   const services = {
//     [paymentProvider.CHECKOUT]: makeCkoService(context),
//     [paymentProvider.MY_FATOORAH]: makeMfService(context),
//   };
//
//   return {
//     getConfig(service) {
//       return services[service].getConfig();
//     },
//     async detectPaymentProvider({ countryCode, paymentMethod = {} }) {
//       // default is checkout
//       let detectedPaymentProvider = {
//         paymentProvider: paymentProvider.CHECKOUT,
//       };
//       Object.keys(availablePaymentServices).map(availablePaymentService => {
//         if (
//           includes(
//             availablePaymentServices[availablePaymentService],
//             countryCode
//           )
//         ) {
//           detectedPaymentProvider = {
//             paymentProvider: availablePaymentService,
//           };
//         }
//
//         return { paymentProvider: availablePaymentService };
//       });
//
//       if (paymentMethod.id) {
//         const { source } = paymentMethod;
//         if (source) {
//           if (source.type === paymentMethodSourceType.TOKEN) {
//             if (/^(mf)_(\d+)$/.test(source.id)) {
//               return { paymentProvider: paymentProvider.MY_FATOORAH };
//             }
//
//             return { paymentProvider: paymentProvider.CHECKOUT };
//           } else if (
//             source.type === paymentMethodSourceType.SAVED_CUSTOMER_CARD_TOKEN
//           ) {
//             const customerCardToken = await context.customerCardToken.getById(
//               source.id
//             );
//             return {
//               paymentProvider: customerCardToken.paymentProvider,
//               customerCardToken,
//             };
//           }
//         }
//         // legacy apps will not send a source object so all will default to MF
//         return { paymentProvider: paymentProvider.MY_FATOORAH };
//       }
//
//       return detectedPaymentProvider;
//     },
//     async getPaymentMethods({
//       countryCode,
//       currencyCode,
//       customerId,
//       amount = '0',
//     }) {
//       const {
//         paymentProvider: usePaymentProvider,
//       } = await this.detectPaymentProvider({
//         countryCode,
//       });
//
//       const getPaymentMethodsData = {
//         customerId,
//         countryCode,
//       };
//       if (usePaymentProvider === paymentProvider.MY_FATOORAH) {
//         getPaymentMethodsData.currencyCode = currencyCode;
//         getPaymentMethodsData.amount = amount;
//       }
//
//       return services[usePaymentProvider].getPaymentMethods(
//         getPaymentMethodsData
//       );
//     },
//     async pay(data) {
//       if (!data) throw new Error('No data provided');
//       const { paymentMethod } = data;
//       if (!paymentMethod) {
//         throw new Error('No paymentMethod provided');
//       }
//
//       let payData = {};
//       const {
//         paymentProvider: usePaymentProvider,
//         customerCardToken,
//       } = await this.detectPaymentProvider({
//         paymentMethod,
//       });
//
//       switch (usePaymentProvider) {
//         case paymentProvider.MY_FATOORAH: {
//           payData = omit(data, ['paymentMethodInput']);
//           if (paymentMethod.source) {
//             // new source token
//             const matches = String(paymentMethod.source.id).match(
//               /^(mf)_(\d+)$/
//             );
//             payData.paymentMethod = matches[2] || null;
//           } else {
//             payData.paymentMethod = data.paymentMethod.id;
//           }
//           break;
//         }
//         case paymentProvider.CHECKOUT: {
//           const callbackUrl = buildAbsoluteUrl(`/cko/payment-callback`);
//           payData = {
//             token: customerCardToken
//               ? customerCardToken.sourceToken
//               : paymentMethod.source.id,
//             amount: data.amount,
//             currency: data.currencyCode,
//             customerId: data.customerId,
//             reference: `${data.orderType}#${data.referenceOrderId}`,
//             successUrl: callbackUrl,
//             failureUrl: callbackUrl,
//           };
//           break;
//         }
//         default:
//           break;
//       }
//
//       return services[usePaymentProvider].pay(payData);
//     },
//     async getCustomerSavedCardTokens({ paymentProvider, customerId }) {
//       return services[paymentProvider].getCustomerSavedCardTokens(customerId);
//     },
//     async saveCardToken(data) {
//       if (!data) {
//         throw new Error('No data provided');
//       }
//       return services[paymentProvider.CHECKOUT].saveCardToken(data);
//     },
//     setDefaultCardToken({ id, isDefault, customerId }) {
//       return context.customerCardToken.setDefault(id, customerId, isDefault);
//     },
//     deleteCardToken({ id, customerId }) {
//       return context.customerCardToken.softDelete(id, customerId);
//     },
//     paymentStatus(data) {
//       return services[paymentProvider.CHECKOUT].paymentStatus(data);
//     },
//   };
// }
//
// module.exports = makePaymentService;
