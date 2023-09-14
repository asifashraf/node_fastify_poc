const { fetchGraphQL } = require('../../lib/test-util');

test('giftCards', async () => {
  const query = `
  {
    giftCards(
      paging: {offset: 0, limit: 100}
    )
    {
      items {
        id
        code
        imageUrl {
          en
          ar
        }
        transactions {
          debit
          credit
          orderType
        }
        country {
          id
          name{
            en
            ar
          }
        }
        currency {
          id
          symbol {
            en
            ar
          }
        }
        sender {
          firstName
          lastName
        }
        receiver {
          firstName
          lastName
        }
        giftCardTemplate {
          id
          name {
            en
            ar
          }
          collection {
            id
            country {
              id
              name {
                en
                ar
              }
            }
            name {
              en
              ar
            }
          }
        }
        giftCardOrder {
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
            collection {
              id
              country {
                id
                name {
                  en
                  ar
                }
              }
              name {
                en
                ar
              }
            }
          }
          customer {
            firstName
            lastName
          }
        }
      }
    }
  }
  `;
  const result = await fetchGraphQL(query);
  expect(result).toMatchObject(
    expect.objectContaining({
      data: expect.objectContaining({
        giftCards: expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              code: expect.any(String),
              imageUrl: expect.objectContaining({
                en: expect.any(String),
                ar: expect.any(String),
              }),
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
              sender: expect.objectContaining({
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

// test('redeemGiftCard', async () => {
//   const query = `
//   mutation
//   {
//     redeemGiftCard(
//       code: "abc163"
//     )
//     {
//       redeemed
//       error
//       giftCard {
//         id
//         redeemedOn
//         imageUrl {
//           en
//           ar
//         }
//         initialAmount
//         receiver {
//           id
//         }
//       }
//     }
//   }
//   `;
//   const result = await fetchGraphQL(query);
//   expect(result).toMatchObject(
//     expect.objectContaining({
//       data: expect.objectContaining({
//         redeemGiftCard: expect.objectContaining({
//           redeemed: true,
//         }),
//       }),
//     })
//   );
// });
