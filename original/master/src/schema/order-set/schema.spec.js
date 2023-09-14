const {
  fetchGraphQL,
  getFirstId,
  testDb,
  redis,
  // queryContext,
} = require('../../lib/test-util');
// const { transformToCamelCase } = require('../../lib/util');
// const KD = require('../../lib/currency');
const {
  orderSetDetails,
  sampleCustomerId,
  sampleOrderSetId,
  // sampleBrandLocationId,
  // orderPaymentMethodInput,
} = require('../../lib/test-fragments');
const {
  orderSets,
  // coupons,
  // couponDetails,
  // countries,
  // currencies,
} = require('../../../database/seeds/development/index');
const schema = require('../../schema-loader')();
const QueryContext = require('../../query-context');

// const { orderDetails } = require('../../lib/test-fragments');
// const { first, find } = require('lodash');
const OrderSet = require('./model');
// const { renderConfirmationEmail } = require('./email-confirmation-renderer');
const sqs = require('../../lib/sqs');
// const { couponType } = require('../root/enums');

sqs.receiveMessage = jest.fn().mockImplementation(() => Promise.resolve('ok'));
sqs.sendMessage = jest.fn().mockImplementation(() => Promise.resolve('ok'));
sqs.deleteMessage = jest.fn().mockImplementation(() => Promise.resolve('ok'));

jest.mock('../../lib/metrics');

// @todo: redo all commented tests

// test('place a pickup order that payment service will accept', async () => {
//   require('../../lib/my-fatoorah').setNextResponce('success');
//   const mutation = `mutation {
//    pickupOrderCreate(order:{
//       items:[{
//         itemId: "1902b625-d495-4d8c-8265-e0c53a57eef0"
//         quantity:1
//         price: "12"
//         type: DRINK
//         note: "ItemNote"
//         selectedOptions:[{
//           optionId:"586decab-c8a1-42b0-9a08-61a6f568b954"
//           price:"12.12"
//         },
//         {
//           optionId:"1ae5845b-3fbf-4795-8973-a5fbd41f0a4d"
//           price:"14.14"
//         }]
//       }]
//       brandLocationId: "7dbb5759-33bc-49c4-b7ba-278433fe5b8a"
//       note: "Test Pickup Order"
//       subtotal: "14.14"
//       fee: "15.66"
//       total: "1"
//       paymentMethod: ${orderPaymentMethodInput}
//       datetime: "2017-11-01 09:00:00"
//       deliverToVehicle: true
//       asap: true
//       receiptUrl: "https://cofedistrictapi.com/knet-receipt"
//       errorUrl: "https://cofedistrictapi.com/knet-error"
//       vehicleColor: "Red"
//       vehicleDescription: "Ferrari"
//     }
//     ) {
//       paymentUrl
//       error
//       orderSet {
//         ${orderDetails}
//         currentStatus
//         payment {
//           statusHistory {
//             name
//           }
//           currentStatus {
//             name
//           }
//         }
//       }
//     }
//   }`;
//
//   const result = await fetchGraphQL(mutation);
//   expect(result).toMatchSnapshot();
// }, 5000);
//
// test('place a pickup order that payment service will fail', async () => {
//   // Mock Implementation
//   require('../../lib/my-fatoorah').setNextResponce('badRequest');
//   const mutation = `mutation {
//    pickupOrderCreate(order:{
//       items:[{
//         itemId: "1902b625-d495-4d8c-8265-e0c53a57eef0"
//         quantity:1
//         price: "12"
//         type: DRINK
//         note: "ItemNote"
//         selectedOptions:[{
//           optionId:"586decab-c8a1-42b0-9a08-61a6f568b954"
//           price:"12.12"
//         },
//         {
//           optionId:"1ae5845b-3fbf-4795-8973-a5fbd41f0a4d"
//           price:"14.14"
//         }]
//       }]
//       brandLocationId: "7dbb5759-33bc-49c4-b7ba-278433fe5b8a"
//       note: "Test Pickup Order"
//       subtotal: "14.14"
//       fee: "15.66"
//       total: "1"
//       paymentMethod: ${orderPaymentMethodInput}
//       datetime: "2017-11-01 09:00:00"
//       deliverToVehicle: true
//       asap: true
//       receiptUrl: "https://cofedistrictapi.com/knet-receipt"
//       errorUrl: "https://cofedistrictapi.com/knet-error"
//       vehicleColor: "Red"
//       vehicleDescription: "Ferrari"
//     }
//     ) {
//       paymentUrl
//       error
//       orderSet {
//         ${orderDetails}
//         currentStatus
//         payment {
//           statusHistory {
//             name
//           }
//           currentStatus {
//             name
//           }
//         }
//       }
//     }
//   }`;
//
//   // openInGraphiql(query);
//   const result = await fetchGraphQL(mutation);
//   expect(result).toMatchSnapshot();
// }, 5000);
//
// test('place a pickup order and HTTP will fail', async () => {
//   // Mock Implementation
//   require('../../lib/my-fatoorah').setNextResponce('httpError');
//
//   const mutation = `mutation {
//    pickupOrderCreate(order:{
//       items:[{
//         itemId: "1902b625-d495-4d8c-8265-e0c53a57eef0"
//         quantity:1
//         price: "12"
//         type: DRINK
//         note: "ItemNote"
//         selectedOptions:[{
//           optionId:"586decab-c8a1-42b0-9a08-61a6f568b954"
//           price:"12.12"
//         },
//         {
//           optionId:"1ae5845b-3fbf-4795-8973-a5fbd41f0a4d"
//           price:"14.14"
//         }]
//       }]
//       brandLocationId: "7dbb5759-33bc-49c4-b7ba-278433fe5b8a"
//       note: "Test Pickup Order"
//       subtotal: "14.14"
//       fee: "15.66"
//       total: "1"
//       paymentMethod: ${orderPaymentMethodInput}
//       datetime: "2017-11-01 09:00:00"
//       deliverToVehicle: true
//       asap: true
//       receiptUrl: "https://cofedistrictapi.com/knet-receipt"
//       errorUrl: "https://cofedistrictapi.com/knet-error"
//       vehicleColor: "Red"
//       vehicleDescription: "Ferrari"
//     }
//     ) {
//       paymentUrl
//       error
//       orderSet {
//         ${orderDetails}
//         currentStatus
//         payment {
//           statusHistory {
//             name
//           }
//           currentStatus {
//             name
//           }
//         }
//       }
//     }
//   }`;
//
//   const result = await fetchGraphQL(mutation);
//   expect(result).toMatchSnapshot();
// }, 5000);

test('customer can resolve order set', async () => {
  const { id: customerId } = await getFirstId('customers');

  const query = `{
    customer(id: "${customerId}") {
        orderSets { ${orderSetDetails} }
      }
    }`;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
}, 5000);

// test('order set save internal note', async () => {
//   const mutation = ` mutation{
//     orderSetSaveInternalNote(orderSet:{id:"${orderSets[0].id}",comments:[{userName:"test",avatar:"test",comment:"test"}]}) {
//       error
//       orderSet {
//         ${orderSetDetails}
//       }
//     }
//   }`;
//
//   // console.log(mutation);
//   const result = await fetchGraphQL(mutation);
//   expect(result).toMatchSnapshot();
// }, 5000);

test('customer can resolve past and upcoming order sets', async () => {
  const query = `{
  customer(id:"${sampleCustomerId}") {
      pastOrderSets(paging:{offset:0,limit:2}) {${orderSetDetails} }
      upcomingOrderSets(paging:{offset:0,limit:2}) { ${orderSetDetails} }
    }
  }`;

  // openInGraphiql(query);
  const result = await fetchGraphQL(query);

  expect(result).toMatchSnapshot();
}, 5000);

// test('payment success generates appropriate notifications', async () => {
//   const context = new QueryContext(testDb, redis, {}, {}, schema);
//   const notifications = await context.orderSet.paymentStatusChangeNotifications(
//     sampleOrderSetId,
//     'PAYMENT_SUCCESS',
//     {
//       paymentid: '1012436440373540',
//       result: 'CAPTURED',
//       auth: '490966',
//       ref: '735403423488',
//       tranid: '5989611450373540',
//       postdate: '1220',
//       trackid: sampleOrderSetId,
//       responsecode: '00',
//       eci: '7',
//     },
//     context
//   );
//   expect(notifications).toMatchSnapshot();
// }, 5000);

test('payment failure generates appropriate notifications', async () => {
  const context = new QueryContext(testDb, redis, {}, {}, schema);
  const notifications = await context.orderSet.paymentStatusChangeNotifications(
    sampleOrderSetId,
    'PAYMENT_FAILURE',
    {
      paymentid: '1012436440373540',
      result: 'NOT CAPTURED',
      auth: '490966',
      ref: '735403423488',
      tranid: '5989611450373540',
      postdate: '1220',
      trackid: sampleOrderSetId,
      responsecode: '00',
      eci: '7',
    },
    context
  );
  expect(notifications).toMatchSnapshot();
}, 5000);

test('payment cancellation generates appropriate notifications', async () => {
  const context = new QueryContext(testDb, redis, {}, {}, schema);
  const notifications = await context.orderSet.paymentStatusChangeNotifications(
    sampleOrderSetId,
    'PAYMENT_FAILURE',
    {
      paymentid: '1012436440373540',
      result: 'CANCELLED',
      auth: '490966',
      ref: '735403423488',
      tranid: '5989611450373540',
      postdate: '1220',
      trackid: sampleOrderSetId,
      responsecode: '00',
      eci: '7',
    },
    context
  );
  expect(notifications).toMatchSnapshot();
}, 5000);

test('order sets returned paged,filtered by date range and brand Location', async () => {
  const { id: brandLocationId } = await getFirstId('brand_locations');

  const query = `{
    orderSets(paging: {limit: 10, offset:0},dateRange:{startDate:"2011-01-01",endDate:"2022-01-12"},brandLocationId:"${brandLocationId}") {
      id
      fulfillment {
        time
      }
    }
  }
  `;

  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
}, 5000);

test('order sets queried by brand id', async () => {
  const { id: brandId } = await getFirstId('brands');

  const query = `{
    orderSets(brandId:"${brandId}") {
      id
      brandLocation {
        brand {
          name {
            en
            ar
          }
        }
      }
    }
  }
  `;

  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
}, 5000);

test('active order sets can be retrieved by shortCode', async () => {
  const query = `{
    orderSetsForShortCode(shortCode:"${orderSets[0].shortCode}") {${orderSetDetails}}
  }
  `;

  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
}, 5000);

test('order set mark as Acknowledged', async () => {
  const mutation = `mutation {
    orderSetAcknowledge(orderSet:{id:"${orderSets[0].id}"}) {
      error
      orderSet {
        id
        shortCode
        acknowledged
      }
    }
    }
  `;

  // openInGraphiql(query);
  const result = await fetchGraphQL(mutation);
  expect(result).toMatchSnapshot();
}, 5000);

// test('order set reject and undo', async () => {
//   const rejectMutation = `mutation {
//     orderSetCreateRejection(orderSetId:"${orderSets[0].id}",rejectionInfo:{
//       reason:OUT_OF_STOCK
//       note:"No more cookies"
//     }) {
//       id
//       status
//     }
//    }
//   `;
//   // openInGraphiql(query);
//   const result = await fetchGraphQL(rejectMutation);
//   expect(result).toMatchSnapshot();
//
//   const undoMutation = `mutation {
//     orderSetUndoRejection(orderSetId:"${orderSets[0].id}") {
//       id
//       status
//     }
//    }`;
//
//   // openInGraphiql(query);
//   expect(await fetchGraphQL(undoMutation)).toMatchSnapshot();
// }, 5000);

test('order set mark as Acknowledged with invalid id', async () => {
  const mutation = `mutation {
    orderSetAcknowledge(orderSet:{id:"1902b625-d495-4d8c-8265-e0c53a57eef0"}) {
      error
      orderSet {
        id
        shortCode
      }
    }
    }
  `;

  // openInGraphiql(query);
  const result = await fetchGraphQL(mutation);
  expect(result).toMatchSnapshot();
}, 5000);

test('order set mark orderSetSaveInternalNote ', async () => {
  const mutation = `mutation {
    orderSetSaveInternalNote(orderSet:{id:"${orderSets[0].id}",comments:[{userName:"test",avatar:"test",comment:"test"}]}) {
      error
      orderSet {
        id
        shortCode
      }
    }
    }
  `;

  // openInGraphiql(query);
  const result = await fetchGraphQL(mutation);
  expect(result).toMatchSnapshot();
}, 5000);

test('active order sets can be returned', async () => {
  const query = `{
    activeOrderSets(paging:{limit:1,offset:0}) {${orderSetDetails}}
  }
  `;

  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
}, 5000);
//
// test('can place a delivery order', async () => {
//   const { id: addressId } = await testDb
//     .handle('customer_addresses')
//     .select('id')
//     .where('customer_id', sampleCustomerId)
//     .limit(1)
//     .then(first);
//
//   const mutation = `mutation {
//  deliveryOrderCreate(order:{
//     items:[{
//       itemId: "1902b625-d495-4d8c-8265-e0c53a57eef0"
//       quantity:1
//       price: "12"
//       type: DRINK
//       note: "ItemNote"
//       selectedOptions:[{
//         optionId:"586decab-c8a1-42b0-9a08-61a6f568b954"
//         price:"12.12"
//       },
//       {
//         optionId:"1ae5845b-3fbf-4795-8973-a5fbd41f0a4d"
//         price:"14.14"
//       }]
//     }]
//   	addressId: "${addressId}"
//   	couponId:"34a983df-3f7d-4a7a-bd28-5071bc762a58"
//    	brandLocationId: "903fb8ed-9ebc-4a36-8e92-4305d157c929"
//   	note: "can place a delivery order"
//   	subtotal: "14.14"
//   	fee: "15.66"
//   	total: "0"
//   	paymentMethod: ${orderPaymentMethodInput}
//   	datetimes: ["2017-12-01 09:00:00"]
//   	receiptUrl: "https://cofedistrictapi.com/knet-receipt"
//   	errorUrl: "https://cofedistrictapi.com/knet-error"
//   }
//   ) {
//     paymentUrl
//     error
//     orderSet {
//       id
//       currentStatus
//       fulfillment {
//         asap
//       }
//       payment {
//         statusHistory {
//           name
//         }
//         currentStatus {
//           name
//         }
//       }
//     }
//   }
// }`;
//
//   // openInGraphiql(mutation);
//   const result = await fetchGraphQL(mutation);
//   expect(result).toMatchSnapshot();
// }, 5000);
//
// test('can place an asap delivery order', async () => {
//   const { id: addressId } = await testDb
//     .handle('customer_addresses')
//     .select('id')
//     .where('customer_id', sampleCustomerId)
//     .limit(1)
//     .then(first);
//
//   const mutation = `mutation {
//  deliveryOrderCreate(order:{
//     items:[{
//       itemId: "1902b625-d495-4d8c-8265-e0c53a57eef0"
//       quantity:1
//       price: "12"
//       type: DRINK
//       note: "ItemNote"
//       selectedOptions:[{
//         optionId:"586decab-c8a1-42b0-9a08-61a6f568b954"
//         price:"12.12"
//       },
//       {
//         optionId:"1ae5845b-3fbf-4795-8973-a5fbd41f0a4d"
//         price:"14.14"
//       }]
//     }]
//   	addressId: "${addressId}"
//   	couponId:"34a983df-3f7d-4a7a-bd28-5071bc762a58"
//    	brandLocationId: "903fb8ed-9ebc-4a36-8e92-4305d157c929"
//   	note: "can place a delivery order"
//   	subtotal: "14.14"
//   	fee: "15.66"
//   	total: "0"
//   	paymentMethod: ${orderPaymentMethodInput}
//   	datetimes: ["2017-11-15T12:45:00+03:00"]
//   	receiptUrl: "https://cofedistrictapi.com/knet-receipt"
//   	errorUrl: "https://cofedistrictapi.com/knet-error"
//   }
//   ) {
//     paymentUrl
//     error
//     orderSet {
//       id
//       currentStatus
//       fulfillment {
//         asap
//       }
//       payment {
//         statusHistory {
//           name
//         }
//         currentStatus {
//           name
//         }
//       }
//     }
//   }
// }`;
//
//   // openInGraphiql(query);
//   const result = await fetchGraphQL(mutation);
//   expect(result).toMatchSnapshot();
// }, 5000);
//
// test('can place a delivery order to a tower', async () => {
//   require('../../lib/my-fatoorah').setNextResponce('success');
//   const { id: towerId } = await testDb
//     .handle('towers')
//     .select('id')
//     .limit(1)
//     .then(first);
//
//   const mutation = `mutation {
//      deliveryOrderCreate(order:{
//         items:[{
//           itemId: "1902b625-d495-4d8c-8265-e0c53a57eef0"
//           quantity:1
//           price: "12"
//           type: DRINK
//           note: "ItemNote"
//           selectedOptions:[{
//             optionId:"586decab-c8a1-42b0-9a08-61a6f568b954"
//             price:"12.12"
//           },
//           {
//             optionId:"1ae5845b-3fbf-4795-8973-a5fbd41f0a4d"
//             price:"14.14"
//           }]
//         }]
//         tower: {
//           id:"${towerId}"
//           floor: "floor"
//           unitNumber: "unit"
//         }
//         brandLocationId: "7dbb5759-33bc-49c4-b7ba-278433fe5b8a"
//         note: "can place a delivery order to a tower"
//         subtotal: "14.14"
//         fee: "15.66"
//         total: "0"
//         paymentMethod: ${orderPaymentMethodInput}
//         datetimes: ["2017-11-01 09:00:00"]
//         receiptUrl: "https://cofedistrictapi.com/knet-receipt"
//         errorUrl: "https://cofedistrictapi.com/knet-error"
//       }
//       ) {
//         paymentUrl
//         error
//         orderSet {
//           ${orderDetails}
//           currentStatus
//           payment {
//             statusHistory {
//               name
//             }
//             currentStatus {
//               name
//             }
//           }
//         }
//       }
//     }`;
//
//   const result = await fetchGraphQL(mutation);
//   expect(result).toMatchSnapshot();
// }, 5000);
//
// test('delivery order validations work when sending invalid information', async () => {
//   const brandLocationId = '903fb8ed-9ebc-4a36-8e92-4305d157c929';
//
//   await testDb
//     .handle('brand_locations')
//     .where('id', brandLocationId)
//     .update({
//       acceptingOrders: false,
//     });
//
//   const mutation = `mutation {
//      deliveryOrderCreate(order:{
//         items:[{
//           itemId: "1902b625-d495-4d8c-8265-e0c53a57eef0"
//           quantity:0
//           price: "12"
//           type: DRINK
//           note: "ItemNote"
//           selectedOptions:[{
//             optionId:"586decab-c8a1-42b0-9a08-61a6f568b954"
//             price:"12.12"
//           },
//           {
//             optionId:"ec3b3029-e906-4414-ab47-d29f1e5a056a"
//             price:"14.14"
//           }]
//         }]
//         tower: {
//           id:"1ae5845b-3fbf-4795-8973-a5fbd41f0a4d"
//           floor: "floor"
//           unitNumber: "unit"
//         }
//         couponId: "817a13c0-3085-4563-975d-44e9122e610f"
//         brandLocationId: "${brandLocationId}"
//         note: "delivery order validations work when sending invalid information"
//         subtotal: "14.14"
//         fee: "15.66"
//         total: "0"
//         paymentMethod: ${orderPaymentMethodInput}
//         datetimes: ["2001-11-01 09:00:00"]
//         receiptUrl: "https://cofedistrictapi.com/knet-receipt"
//         errorUrl: "https://cofedistrictapi.com/knet-error"
//       }
//       ) {
//         paymentUrl
//         error
//         orderSet {
//           ${orderDetails}
//           currentStatus
//           payment {
//             statusHistory {
//               name
//             }
//             currentStatus {
//               name
//             }
//           }
//         }
//       }
//     }`;
//
//   // openInGraphiql(query);
//   const result = await fetchGraphQL(mutation);
//   expect(result).toMatchSnapshot();
// }, 5000);
//
// test('delivery order validations work when sending invalid information 2 ', async () => {
//   const mutation = `mutation {
//      deliveryOrderCreate(order:{
//         items:[{
//           itemId: "1902b625-d495-4d8c-8265-e0c53a57eef0"
//           quantity:0
//           price: "12"
//           type: DRINK
//           note: "ItemNote"
//           selectedOptions:[{
//             optionId:"586decab-c8a1-42b0-9a08-61a6f568b954"
//             price:"12.12"
//           },
//           {
//             optionId:"ec3b3029-e906-4414-ab47-d29f1e5a056a"
//             price:"14.14"
//           }]
//         }]
//         addressId:"1ae5845b-3fbf-4795-8973-a5fbd41f0a4d"
//         brandLocationId: "903fb8ed-9ebc-4a36-8e92-4305d157c929"
//         note: "delivery order validations work when sending invalid information 2"
//         subtotal: "14.14"
//         fee: "15.66"
//         total: "0"
//         paymentMethod: ${orderPaymentMethodInput}
//         datetimes: ["2001-11-01 09:00:00"]
//         receiptUrl: "https://cofedistrictapi.com/knet-receipt"
//         errorUrl: "https://cofedistrictapi.com/knet-error"
//       }
//       ) {
//         paymentUrl
//         error
//         orderSet {
//           ${orderDetails}
//           currentStatus
//           payment {
//             statusHistory {
//               name
//             }
//             currentStatus {
//               name
//             }
//           }
//         }
//       }
//     }`;
//
//   // openInGraphiql(query);
//   const result = await fetchGraphQL(mutation);
//   expect(result).toMatchSnapshot();
// }, 5000);
//
// test('delivery order validations work when sending invalid information 3 ', async () => {
//   const mutation = `mutation {
//      deliveryOrderCreate(order:{
//         items:[{
//           itemId: "1902b625-d495-4d8c-8265-e0c53a57eef0"
//           quantity:0
//           price: "12"
//           type: DRINK
//           note: "ItemNote"
//           selectedOptions:[{
//             optionId:"586decab-c8a1-42b0-9a08-61a6f568b954"
//             price:"12.12"
//           },
//           {
//             optionId:"1ae5845b-3fbf-4795-8973-a5fbd41f0a4d"
//             price:"14.14"
//           }]
//         }]
//         addressId:""
//         brandLocationId: "7dbb5759-33bc-49c4-b7ba-278433fe5b8a"
//         note: "delivery order validations work when sending invalid information 3"
//         subtotal: "14.14"
//         fee: "15.66"
//         total: "0"
//         paymentMethod: ${orderPaymentMethodInput}
//         datetimes: ["2001-11-01 09:00:00"]
//         receiptUrl: "https://cofedistrictapi.com/knet-receipt"
//         errorUrl: "https://cofedistrictapi.com/knet-error"
//       }
//       ) {
//         paymentUrl
//         error
//         orderSet {
//           ${orderDetails}
//           currentStatus
//           payment {
//             statusHistory {
//               name
//             }
//             currentStatus {
//               name
//             }
//           }
//         }
//       }
//     }`;
//
//   // openInGraphiql(query);
//   const result = await fetchGraphQL(mutation);
//   expect(result).toMatchSnapshot();
// }, 5000);
//
// test('delivery order validations work when sending invalid information 4 ', async () => {
//   const mutation = `mutation {
//      deliveryOrderCreate(order:{
//         items:[{
//           itemId: "1902b625-d495-4d8c-8265-e0c53a57eef0"
//           quantity:0
//           price: "12"
//           type: DRINK
//           note: "ItemNote"
//           selectedOptions:[{
//             optionId:"586decab-c8a1-42b0-9a08-61a6f568b954"
//             price:"12.12"
//           },
//           {
//             optionId:"1ae5845b-3fbf-4795-8973-a5fbd41f0a4d"
//             price:"14.14"
//           }]
//         }]
//         addressId:"0801faa2-cc91-415c-a689-b796b06668d0"
//         brandLocationId: "7dbb5759-33bc-49c4-b7ba-278433fe5b8a"
//         note: "delivery order validations work when sending invalid information 4"
//         subtotal: "14.14"
//         fee: "15.66"
//         total: "0"
//         paymentMethod: ${orderPaymentMethodInput}
//         datetimes: ["2001-11-01 09:00:00"]
//         receiptUrl: "https://cofedistrictapi.com/knet-receipt"
//         errorUrl: "https://cofedistrictapi.com/knet-error"
//       }
//       ) {
//         paymentUrl
//         error
//         orderSet {
//           ${orderDetails}
//           currentStatus
//           payment {
//             statusHistory {
//               name
//             }
//             currentStatus {
//               name
//             }
//           }
//         }
//       }
//     }`;
//
//   // openInGraphiql(query);
//   const result = await fetchGraphQL(mutation);
//   expect(result).toMatchSnapshot();
// }, 5000);
//
// test('pickup order validations work when sending invalid information ', async () => {
//   const mutation = `mutation {
//      pickupOrderCreate(order:{
//         items:[{
//           itemId: "1902b625-d495-4d8c-8265-e0c53a57eef0"
//           quantity:0
//           price: "12"
//           type: DRINK
//           note: "ItemNote"
//           selectedOptions:[{
//             optionId:"586decab-c8a1-42b0-9a08-61a6f568b954"
//             price:"12.12"
//           },
//           {
//             optionId:"1ae5845b-3fbf-4795-8973-a5fbd41f0a4d"
//             price:"14.14"
//           }]
//         }]
//         brandLocationId: "7dbb5759-33bc-49c4-b7ba-278433fe5b8a"
//         note: "pickup order validations work when sending invalid information "
//         subtotal: "14.14"
//         fee: "15.66"
//         total: "0"
//         paymentMethod: ${orderPaymentMethodInput}
//         deliverToVehicle: true
//         datetime: "2001-11-01 09:00:00"
//         receiptUrl: "https://cofedistrictapi.com/knet-receipt"
//         errorUrl: "https://cofedistrictapi.com/knet-error"
//         asap:true
//       }
//       ) {
//         paymentUrl
//         error
//         orderSet {
//           ${orderDetails}
//           currentStatus
//           payment {
//             statusHistory {
//               name
//             }
//             currentStatus {
//               name
//             }
//           }
//         }
//       }
//     }`;
//
//   // openInGraphiql(query);
//   const result = await fetchGraphQL(mutation, {
//     __user: { id: 'iDoNotExist' },
//   });
//   expect(result).toMatchSnapshot();
// }, 5000);
//
// test('can place a delivery order using credits', async () => {
//   const { id: towerId } = await testDb
//     .handle('towers')
//     .select('id')
//     .limit(1)
//     .then(first);
//
//   const mutation = `mutation {
//      deliveryOrderCreate(order:{
//         items:[{
//           itemId: "1902b625-d495-4d8c-8265-e0c53a57eef0"
//           quantity:1
//           price: "12"
//           type: DRINK
//           note: "ItemNote"
//           selectedOptions:[{
//             optionId:"586decab-c8a1-42b0-9a08-61a6f568b954"
//             price:"12.12"
//           },
//           {
//             optionId:"1ae5845b-3fbf-4795-8973-a5fbd41f0a4d"
//             price:"14.14"
//           }]
//         }]
//         tower: {
//           id:"${towerId}"
//           floor: "floor"
//           unitNumber: "unit"
//         }
//         brandLocationId: "7dbb5759-33bc-49c4-b7ba-278433fe5b8a"
//         note: "can place a delivery order to a tower"
//         subtotal: "14.14"
//         fee: "15.66"
//         total: "29.8"
//         paymentMethod: {
//           id: "CREDITS"
//           name: {
//             en: "COFE Credits"
//             ar: "رصيد كوفي"
//           }
//           serviceCharge: "0"
//           totalAmount: "10.000"
//           currencyId: "currencyId"
//           directPayment: true
//         }
//         datetimes: ["2017-11-01 09:00:00"]
//         receiptUrl: "https://cofedistrictapi.com/knet-receipt"
//         errorUrl: "https://cofedistrictapi.com/knet-error"
//       }
//       ) {
//         paymentUrl
//         error
//         orderSet {
//           ${orderDetails}
//           currentStatus
//           creditsUsed
//           payment {
//             statusHistory {
//               name
//             }
//             currentStatus {
//               name
//             }
//           }
//         }
//       }
//     }`;
//
//   // openInGraphiql(mutation);
//   const result = await fetchGraphQL(mutation);
//   expect(result).toMatchSnapshot();
// }, 5000);
//
// test('can place a delivery order using cash on delivery', async () => {
//   const { id: towerId } = await testDb
//     .handle('towers')
//     .select('id')
//     .limit(1)
//     .then(first);
//
//   const mutation = `mutation {
//      deliveryOrderCreate(order:{
//         items:[{
//           itemId: "1902b625-d495-4d8c-8265-e0c53a57eef0"
//           quantity:1
//           price: "12"
//           type: DRINK
//           note: "ItemNote"
//           selectedOptions:[{
//             optionId:"586decab-c8a1-42b0-9a08-61a6f568b954"
//             price:"12.12"
//           },
//           {
//             optionId:"1ae5845b-3fbf-4795-8973-a5fbd41f0a4d"
//             price:"14.14"
//           }]
//         }]
//         tower: {
//           id:"${towerId}"
//           floor: "floor"
//           unitNumber: "unit"
//         }
//         brandLocationId: "7dbb5759-33bc-49c4-b7ba-278433fe5b8a"
//         note: "can place a delivery order to a tower"
//         subtotal: "14.14"
//         fee: "15.66"
//         total: "29.8"
//         paymentMethod: {
//           id: "CASH"
//           name: {
//             en: "CASH"
//             ar: "نقدًا"
//           }
//           serviceCharge: "0"
//           totalAmount: "10.000"
//           currencyId: "currencyId"
//           directPayment: true
//         }
//         datetimes: ["2017-11-01 09:00:00"]
//         receiptUrl: "https://cofedistrictapi.com/knet-receipt"
//         errorUrl: "https://cofedistrictapi.com/knet-error"
//       }
//       ) {
//         paymentUrl
//         error
//         orderSet {
//           ${orderDetails}
//           currentStatus
//           cashOnDelivery
//           payment {
//             statusHistory {
//               name
//             }
//             currentStatus {
//               name
//             }
//           }
//         }
//       }
//     }`;
//
//   // openInGraphiql(mutation);
//   const result = await fetchGraphQL(mutation);
//   expect(result).toMatchSnapshot();
// }, 5000);
//
// test('cannot place a cod order to a location that does not accept cod orders', async () => {
//   const mutation = `mutation {
//      pickupOrderCreate(order:{
//         items:[{
//           itemId: "1902b625-d495-4d8c-8265-e0c53a57eef0"
//           quantity:1
//           price: "12"
//           type: DRINK
//           note: "ItemNote"
//           selectedOptions:[{
//             optionId:"586decab-c8a1-42b0-9a08-61a6f568b954"
//             price:"12.12"
//           },
//           {
//             optionId:"1ae5845b-3fbf-4795-8973-a5fbd41f0a4d"
//             price:"14.14"
//           }]
//         }]
//         brandLocationId: "903fb8ed-9ebc-4a36-8e92-4305d157c929"
//         note: "should failzo"
//         subtotal: "14.14"
//         fee: "15.66"
//         total: "29.8"
//         paymentMethod: {
//           id: "CASH"
//           name: {
//             en: "CASH"
//             ar: "نقدًا"
//           }
//           serviceCharge: "0"
//           totalAmount: "10.000"
//           currencyId: "currencyId"
//           directPayment: true
//         }
//         deliverToVehicle: false
//         asap: true
//         datetime: "2001-11-01 09:00:00"
//         receiptUrl: "https://cofedistrictapi.com/knet-receipt"
//         errorUrl: "https://cofedistrictapi.com/knet-error"
//       }
//       ) {
//         paymentUrl
//         error
//         orderSet {
//           ${orderDetails}
//           currentStatus
//           cashOnDelivery
//           payment {
//             statusHistory {
//               name
//             }
//             currentStatus {
//               name
//             }
//           }
//         }
//       }
//     }`;
//
//   // openInGraphiql(mutation);
//   const result = await fetchGraphQL(mutation);
//   expect(result).toMatchSnapshot();
// }, 5000);
//
// test('we can mark a COD order as paid', async () => {
//   const createOrderSet = `mutation {
//    pickupOrderCreate(order:{
//       items:[{
//         itemId: "1902b625-d495-4d8c-8265-e0c53a57eef0"
//         quantity:1
//         price: "12"
//         type: DRINK
//         note: "ItemNote"
//         selectedOptions:[{
//           optionId:"586decab-c8a1-42b0-9a08-61a6f568b954"
//           price:"12.12"
//         },
//         {
//           optionId:"1ae5845b-3fbf-4795-8973-a5fbd41f0a4d"
//           price:"14.14"
//         }]
//       }]
//       brandLocationId: "7dbb5759-33bc-49c4-b7ba-278433fe5b8a"
//       note: "Test Pickup Order"
//       subtotal: "14.14"
//       fee: "15.66"
//       total: "1"
//       datetime: "2017-11-01 09:00:00"
//       deliverToVehicle: true
//       asap: true
//       paymentMethod: {
//           id: "CASH"
//           name: {
//             en: "CASH"
//             ar: "نقدًا"
//           }
//           serviceCharge: "0"
//           totalAmount: "10.000"
//           currencyId: "currencyId"
//           directPayment: true
//         }
//       receiptUrl: "https://cofedistrictapi.com/knet-receipt"
//       errorUrl: "https://cofedistrictapi.com/knet-error"
//       vehicleColor: "Red"
//       vehicleDescription: "Ferrari"
//     }
//     ) {
//       paymentUrl
//       error
//       orderSet {
//         id
//         ${orderDetails}
//         currentStatus
//         payment {
//           statusHistory {
//             name
//           }
//           currentStatus {
//             name
//           }
//         }
//       }
//     }
//   }`;
//
//   const {
//     data: {
//       pickupOrderCreate: { orderSet },
//     },
//   } = await fetchGraphQL(createOrderSet);
//
//   const mutation = `mutation {
//      orderSetPayWithCash(orderSetId: "${orderSet.id}", wasPaid: true) {
//         currentStatus
//         payment {
//           statusHistory {
//             name
//             datetime
//           }
//           currentStatus {
//             name
//             datetime
//           }
//         }
//      }
//   }`;
//
//   const {
//     data: {
//       orderSetPayWithCash: { payment },
//     },
//   } = await fetchGraphQL(mutation);
//   const {
//     statusHistory: [current, last],
//     currentStatus,
//   } = payment;
//
//   expect(current.name).toEqual('PAYMENT_SUCCESS');
//   expect(last.name).toEqual('PAYMENT_PENDING');
//   expect(currentStatus.name).toEqual('PAYMENT_SUCCESS');
// }, 5000);

test('reports stream appropriately', async () => {
  const orderSet = new OrderSet(testDb.handle);
  let rowCount = 0;
  const Writable = require('stream').Writable;
  const ws = new Writable({ objectMode: true });

  ws._write = (row, enc, next) => {
    rowCount++;
    expect(row.ID).toBeDefined();
    expect(row.Name).toBeDefined();
    next();
  };

  await orderSet.defaultReport(ws);

  // There are 17 seed order sets, however many of those have multiple
  // orders per set which is a vestige of some previous situation
  // where order sets were really sets. As it stands I don't have time
  // to clean up the seeds to fix this and hunt down the test failures
  // that fixing it would cause.
  expect(rowCount).toEqual(21);
}, 5000);

// test('can render a fucking confirmation email', async () => {
//   const [orderSet] = orderSets;
//   const knetResponse = {
//     ref: 'ref',
//     paymentid: 'ABC',
//     trackid: 'TRACK',
//     result: 'n/a',
//   };
//
//   const { customerId, subject, text, html } = await renderConfirmationEmail(
//     queryContext.handle,
//     orderSet.id,
//     'PAYMENT_SUCCESS',
//     knetResponse
//   );
//
//   expect(customerId).toEqual(orderSet.customer_id);
//   expect(subject).toMatch(orderSet.short_code);
//   expect(text).toMatch(knetResponse.paymentid);
//   expect(text).toMatch(knetResponse.trackid);
//
//   expect(html).toMatch(knetResponse.paymentid);
//   expect(html).toMatch(knetResponse.trackid);
// });

// test('can calculate the price of items', async () => {
//   // const [{ serviceFee, deliveryFee }] = transformToCamelCase(configuration);
//   const [{ serviceFee, deliveryFee }] = transformToCamelCase([
//     find(countries, c => c.name === 'Kuwait'),
//   ]);
//   const items = [
//     { quantity: 1, selectedOptions: [{ price: '1.300' }] },
//     { quantity: 2, selectedOptions: [{ price: '1.050' }] },
//   ];
//
//   const orderSet = new OrderSet(testDb.handle, queryContext.handle);
//
//   const { subtotal, fee, total } = await orderSet.calculatePrice(
//     {
//       items,
//       customerId: sampleCustomerId,
//       brandLocationId: sampleBrandLocationId,
//     },
//     'DELIVERY'
//   );
//   expect(total).toEqual(3.4 + deliveryFee);
//   expect(subtotal).toEqual(3.4);
//   expect(fee).toEqual(deliveryFee);
//
//   // const { total: totalWithVat, totalVat } = await orderSet.calculatePrice(
//   //   {
//   //     items,
//   //     customerId: sampleCustomerId,
//   //     brandLocationId: sampleSaBrandLocationId,
//   //   },
//   //   'DELIVERY'
//   // );
//   //
//   // expect(totalVat).toEqual(0.17);
//   // expect(totalWithVat).toEqual(3.4 + totalVat + deliveryFee);
//
//   const {
//     subtotal: pickupSubtotal,
//     fee: pickupFee,
//     total: pickupTotal,
//   } = await orderSet.calculatePrice(
//     {
//       items,
//       customerId: sampleCustomerId,
//       brandLocationId: sampleBrandLocationId,
//     },
//     'PICKUP'
//   );
//
//   expect(pickupSubtotal).toEqual(3.4);
//   expect(pickupTotal).toEqual(3.4 + serviceFee);
//   expect(pickupFee).toEqual(serviceFee);
//
//   const { id: couponId } = coupons[0];
//   const couponDetail = find(couponDetails, c => c.coupon_id === couponId);
//   await queryContext.handle.coupon.save({
//     id: couponId,
//     redemptionCount: 0,
//     customerRedemptionLimit: 2,
//     couponDetails: [couponDetail],
//   });
//
//   const discount =
//     couponDetail.type === couponType.PERCENTAGE
//       ? 3400 * (couponDetail.amount / 100000)
//       : Number(couponDetail.amount);
//   const {
//     subtotal: couponSubtotal,
//     fee: couponFee,
//     total: couponTotal,
//   } = await orderSet.calculatePrice(
//     {
//       items,
//       couponId,
//       customerId: sampleCustomerId,
//       brandLocationId: sampleBrandLocationId,
//     },
//     'DELIVERY'
//   );
//
//   // subtotal should be equal to the discounted value
//   expect(couponSubtotal).toEqual(3.4);
//   const ct = new KD(3.4, 3, 0.005);
//   expect(couponTotal).toEqual(
//     ct
//       .add(couponFee)
//       .sub(discount)
//       .round().value
//   );
// }, 5000);
//
// test('sending both cash and loyalty options through at the same time defaults to loyalty', async () => {
//   const { id: towerId } = await testDb
//     .handle('towers')
//     .select('id')
//     .limit(1)
//     .then(first);
//
//   const mutation = `mutation {
//      deliveryOrderCreate(order:{
//         items:[{
//           itemId: "1902b625-d495-4d8c-8265-e0c53a57eef0"
//           quantity:1
//           price: "12"
//           type: DRINK
//           note: "ItemNote"
//           selectedOptions:[{
//             optionId:"586decab-c8a1-42b0-9a08-61a6f568b954"
//             price:"12.12"
//           },
//           {
//             optionId:"1ae5845b-3fbf-4795-8973-a5fbd41f0a4d"
//             price:"14.14"
//           }]
//         }]
//         tower: {
//           id:"${towerId}"
//           floor: "floor"
//           unitNumber: "unit"
//         }
//         brandLocationId: "7dbb5759-33bc-49c4-b7ba-278433fe5b8a"
//         note: "can place a delivery order to a tower"
//         subtotal: "14.14"
//         fee: "15.66"
//         total: "29.8"
//         useCredits: true
//         cashOnDelivery: true
//         paymentMethod: {
//           id: "CREDITS"
//           name: {
//             en: "COFE Credits"
//             ar: "رصيد كوفي"
//           }
//           serviceCharge: "0"
//           totalAmount: "10.000"
//           currencyId: "currencyId"
//           directPayment: true
//         }
//         datetimes: ["2017-11-01 09:00:00"]
//         receiptUrl: "https://cofedistrictapi.com/knet-receipt"
//         errorUrl: "https://cofedistrictapi.com/knet-error"
//       }
//       ) {
//         paymentUrl
//         error
//         orderSet {
//           ${orderDetails}
//           currentStatus
//           cashOnDelivery
//           payment {
//             statusHistory {
//               name
//             }
//             currentStatus {
//               name
//             }
//           }
//         }
//       }
//     }`;
//
//   const balance = await queryContext.handle.loyaltyTransaction.getBalanceByCustomer(
//     sampleCustomerId,
//     currencies.kd.id
//   );
//
//   const {
//     data: {
//       deliveryOrderCreate: { error, orderSet },
//     },
//   } = await fetchGraphQL(mutation);
//
//   const newBalance = await queryContext.handle.loyaltyTransaction.getBalanceByCustomer(
//     sampleCustomerId,
//     currencies.kd.id
//   );
//
//   expect(Number(newBalance)).toBeLessThan(Number(balance));
//   expect(error).toBeNull();
//   expect(orderSet.cashOnDelivery).toBeFalsy();
// }, 5000);

test('order set can resolve payment method', async () => {
  const query = `{
       orderSet(id:"${orderSets[0].id}") {
        id
        paymentMethod {
          name {
            en
            ar
          }
        }
      }
      }`;

  const response = await fetchGraphQL(query);
  const {
    data: { orderSet },
  } = response;
  expect(orderSet).toHaveProperty('paymentMethod.name.en');
}, 5000);
