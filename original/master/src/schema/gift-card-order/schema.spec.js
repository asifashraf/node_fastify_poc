const {
  fetchGraphQL,
  // testDb,
  // redis,
} = require('../../lib/test-util');
const { orderPaymentMethodInput } = require('../../lib/test-fragments');
// const QueryContext = require('../../query-context');
// const schema = require('../../schema-loader')();

test('giftCardOrders', async () => {
  const query = `
  {
    giftCardOrders(
      paging: {offset: 0, limit: 100}
      filters: {
        searchText: "7",
        countryId: "01c73b60-2c6a-45f1-8dbf-88a5ce4ad179",
        collectionId: "cc451fc7-3627-4bdd-bcab-c32b20568925",
        brandId: "623c9dfc-f2e8-4800-89d8-9f202f6b7f0e",
        currencyId: "f216d955-0df1-475d-a9ec-08cb6c0f92bb"
      }
    )
    {
      items {
        id
        shortCode
        amount
        country{
          id
          name{
            en
            ar
          }
        }
        currency {
          id
          name
          symbol {
            en
            ar
          }
        }
        giftCardTemplate {
          id
          name {
            en
            ar
          }
        }
        customer {
          firstName
          lastName
        }
      }
    }
  }
  `;
  const result = await fetchGraphQL(query);
  expect(result).toMatchObject(
    expect.objectContaining({
      data: expect.objectContaining({
        giftCardOrders: expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              shortCode: expect.any(String),
              amount: expect.any(String),
              country: expect.objectContaining({
                id: expect.any(String),
                name: expect.objectContaining({
                  en: expect.any(String),
                  ar: expect.any(String),
                }),
              }),
              currency: expect.objectContaining({
                id: expect.any(String),
                symbol: expect.objectContaining({
                  en: expect.any(String),
                  ar: expect.any(String),
                }),
              }),
              giftCardTemplate: expect.objectContaining({
                id: expect.any(String),
                name: expect.objectContaining({
                  en: expect.any(String),
                  ar: expect.any(String),
                }),
              }),
              customer: expect.objectContaining({
                firstName: expect.any(String),
                lastName: expect.any(String),
              }),
            }),
          ]),
        }),
      }),
    })
  );
});

test('giftCardOrders', async () => {
  const query = `
  {
    giftCardOrder(id: "cc451fc7-7296-4bdd-bcab-c32b20568922")
    {
        id
        shortCode
        amount
        country{
          id
          name{
            en
            ar
          }
        }
        currency {
          id
          name
          symbol {
            en
            ar
          }
        }
        giftCardTemplate {
          id
          name {
            en
            ar
          }
        }
        customer {
          firstName
          lastName
        }
    }
  }
  `;
  const result = await fetchGraphQL(query);
  expect(result).toMatchObject(
    expect.objectContaining({
      data: expect.objectContaining({
        giftCardOrder: expect.objectContaining({
          id: expect.any(String),
          shortCode: expect.any(String),
          amount: expect.any(String),
          country: expect.objectContaining({
            id: expect.any(String),
            name: expect.objectContaining({
              en: expect.any(String),
              ar: expect.any(String),
            }),
          }),
          currency: expect.objectContaining({
            id: expect.any(String),
            symbol: expect.objectContaining({
              en: expect.any(String),
              ar: expect.any(String),
            }),
          }),
          giftCardTemplate: expect.objectContaining({
            id: expect.any(String),
            name: expect.objectContaining({
              en: expect.any(String),
              ar: expect.any(String),
            }),
          }),
          customer: expect.objectContaining({
            firstName: expect.any(String),
            lastName: expect.any(String),
          }),
        }),
      }),
    })
  );
});

test('giftCardOrdersCreate', async () => {
  // WIP

  // const query = `
  // mutation {
  //   giftCardOrderCreate(order: {
  //     receiptUrl: "https://cofedistrictapi.com/knet-receipt"
  //     errorUrl: "https://cofedistrictapi.com/knet-loyalty-error"
  //     paymentMethod: ${orderPaymentMethodInput}
  //     countryId: "01c73b60-2c6a-45f1-8dbf-88a5ce4ad179",
  //     currencyId: "f216d955-0df1-475d-a9ec-08cb6c0f92bb",
  //     amount: "200",
  //     giftCardTemplateId: "cc451fc7-9138-4bdd-bcab-c32b20568921",
  //     deliveryMethod: EMAIL,
  //     receiverEmail: "test@test.com",
  //     receiverPhoneNumber: "83838383838",
  //     anonymousSender: false
  //   })
  //   {
  //     paymentUrl
  //     order{
  //       id
  //       shortCode
  //       amount
  //     }
  //   }
  // }
  // `;
  // const result = await fetchGraphQL(query);
  // console.log(result);
  // expect(result).toMatchObject(
  //   expect.objectContaining({
  //     data: expect.objectContaining({
  //       giftCardOrderCreate: expect.objectContaining({
  //         paymentUrl: expect.any(String),
  //         order: expect.objectContaining({
  //           id: expect.any(String),
  //           shortCode: expect.any(String),
  //           amount: expect.any(String),
  //         }),
  //       }),
  //     }),
  //   })
  // );

  expect(orderPaymentMethodInput).toEqual(orderPaymentMethodInput);
});

// test('payment success generates appropriate notifications', async () => {
//   const context = new QueryContext(testDb, redis, {}, {}, schema);
//   // const notifications =
//   await context.giftCardOrder.paymentStatusChangeNotifications(
//     'cc451fc7-7296-4bdd-bcab-c32b20568921',
//     'PAYMENT_SUCCESS',
//     {
//       paymentid: '1012436440373540',
//       result: 'CAPTURED',
//       auth: '490966',
//       ref: '735403423488',
//       tranid: '5989611450373540',
//       postdate: '1220',
//       trackid: 'cc451fc7-7296-4bdd-bcab-c32b20568921',
//       responsecode: '00',
//       eci: '7',
//     },
//     context
//   );
//   // WIP
//   // console.log(notifications);
//   expect('1').toEqual('1');
// });
