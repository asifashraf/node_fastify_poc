const { fetchGraphQL } = require('../../lib/test-util');
// const { find } = require('lodash');
jest.mock('../../lib/metrics');
const {
  loyaltyOrders,
  currencies,
  // loyaltyTiers,
} = require('../../../database/seeds/development/index');
// const { orderPaymentMethodInput } = require('../../lib/test-fragments');
//
// test('place a loyalty order that payment service will accept', async () => {
//   require('../../lib/my-fatoorah').setNextResponce('success');
//
//   const mutation = `mutation {
//     loyaltyOrderCreate(order:{
//       sku: "${loyaltyTiers[0].sku}"
//       receiptUrl: "https://cofedistrictapi.com/knet-receipt"
//       errorUrl: "https://cofedistrictapi.com/knet-loyalty-error"
//       paymentMethod: ${orderPaymentMethodInput}
//     }) {
//       error
//       errors
//       paymentUrl
//       order {
//         id
//         sku
//         amount
//         bonus
//         payment {
//           merchantId
//           referenceId
//           currentStatus {
//             name
//           }
//         }
//         customer {
//           creditBalance(currencyId: "${currencies.kd.id}")
//         }
//       }
//     }
//   }`;
//
//   // openInGraphiql(query);
//   const result = await fetchGraphQL(mutation);
//   expect(result).toMatchSnapshot();
// });
//
// test('place a loyalty TOPUP order that payment service will accept', async () => {
//   require('../../lib/my-fatoorah').setNextResponce('success');
//
//   const loyaltyTier = find(loyaltyTiers, t => t.custom_amount);
//
//   const mutation = `mutation {
//     loyaltyOrderCreate(order:{
//       sku: "${loyaltyTier.sku}"
//       topUpAmount: "123.456"
//       receiptUrl: "https://cofedistrictapi.com/knet-receipt"
//       errorUrl: "https://cofedistrictapi.com/knet-loyalty-error"
//       paymentMethod: ${orderPaymentMethodInput}
//     }) {
//       error
//       errors
//       paymentUrl
//       order {
//         id
//         sku
//         amount
//         bonus
//         customer {
//           creditBalance(currencyId: "${currencies.kd.id}")
//         }
//       }
//     }
//   }`;
//
//   // openInGraphiql(query);
//   const result = await fetchGraphQL(mutation);
//   expect(result).toMatchSnapshot();
// });

test('can retrieve a loyalty order by id', async () => {
  const query = `{
       loyaltyOrder(id:"${loyaltyOrders[0].id}") {
        id
        payment {
          currentStatus {
            name
          }
        }
      }
      }`;

  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('loyalty order can resolve currency', async () => {
  const query = `{
       loyaltyOrder(id:"${loyaltyOrders[0].id}") {
        id
        currency {
          id
        }
      }
      }`;

  const {
    data: { loyaltyOrder },
  } = await fetchGraphQL(query);
  expect(loyaltyOrder).toHaveProperty('currency.id', currencies.kd.id);
});

test('loyalty order can resolve payment method', async () => {
  const query = `{
       loyaltyOrder(id:"${loyaltyOrders[0].id}") {
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
    data: { loyaltyOrder },
  } = response;
  expect(loyaltyOrder).toHaveProperty('paymentMethod.name.en');
});

test('can get loyalty orders', async () => {
  const query = `{
    loyaltyOrders {
      id
    }
  }`;
  const {
    data: { loyaltyOrders: fetchedLoyaltyOrders },
  } = await fetchGraphQL(query);
  expect(fetchedLoyaltyOrders).toEqual(
    expect.arrayContaining([expect.anything()])
  );
  expect(fetchedLoyaltyOrders.length).toBeGreaterThan(0);
  fetchedLoyaltyOrders.map(fetchedLoyaltyOrder => {
    return expect(fetchedLoyaltyOrder).toHaveProperty('id');
  });
});
