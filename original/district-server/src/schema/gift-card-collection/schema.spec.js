const { fetchGraphQL } = require('../../lib/test-util');

test('getGiftCardsForApp', async () => {
  const query = `
  {
    getGiftCardsForApp (countryIso: "KW") {
      collectionId
      type
      templatesTotalCount
      name {
        en
        ar
      }
      templatesTotalCount
      brands{
        id
        name {
          en
          ar
        }
      }
      templates {
        id
        name {
          en
          ar
        }
      }
    }
  }`;
  const result = await fetchGraphQL(query);
  expect(result).toMatchObject(
    expect.objectContaining({
      data: expect.objectContaining({
        getGiftCardsForApp: expect.arrayContaining([
          expect.objectContaining({
            name: expect.objectContaining({
              en: expect.any(String),
              ar: expect.any(String),
            }),
          }),
        ]),
      }),
    })
  );
});

test('giftCardCollections', async () => {
  const query = `
  {
    giftCardCollections(
      paging: {offset: 0, limit: 100}
      filters: {status: ACTIVE, searchText: "2", countryId: "01c73b60-2c6a-45f1-8dbf-88a5ce4ad179" }
    )
    {
      items {
        id
        name {
          en
          ar
        }
        giftCardTemplates {
          id
          name {
            en
            ar
          }
          brand {
            id
            name {
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
          country{
            id
            name{
              en
              ar
            }
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
        giftCardCollections: expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              name: expect.objectContaining({
                en: expect.any(String),
                ar: expect.any(String),
              }),
              giftCardTemplates: expect.arrayContaining([
                expect.objectContaining({
                  id: expect.any(String),
                  name: expect.objectContaining({
                    en: expect.any(String),
                    ar: expect.any(String),
                  }),
                  brand: expect.objectContaining({
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
                  country: expect.objectContaining({
                    id: expect.any(String),
                    name: expect.objectContaining({
                      en: expect.any(String),
                      ar: expect.any(String),
                    }),
                  }),
                }),
              ]),
            }),
          ]),
        }),
      }),
    })
  );
});

test('giftCardCollection', async () => {
  const query = `
  {
    giftCardCollection(id: "cc451fc7-3627-4bdd-bcab-c32b20568926")
    {
        id
        name {
          en
          ar
        }
        giftCardTemplates {
          id
          name {
            en
            ar
          }
          brand {
            id
            name {
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
          country{
            id
            name{
              en
              ar
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
        giftCardCollection: expect.objectContaining({
          id: expect.any(String),
          name: expect.objectContaining({
            en: expect.any(String),
            ar: expect.any(String),
          }),
          giftCardTemplates: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              name: expect.objectContaining({
                en: expect.any(String),
                ar: expect.any(String),
              }),
              brand: expect.objectContaining({
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
              country: expect.objectContaining({
                id: expect.any(String),
                name: expect.objectContaining({
                  en: expect.any(String),
                  ar: expect.any(String),
                }),
              }),
            }),
          ]),
        }),
      }),
    })
  );
});

test('giftCardCollection mutation', async () => {
  const query = `
  mutation {
    giftCardCollectionSave(giftCardCollection:
    {
      name:{
        en: "test name",
        ar: "test name ar"
      }
      countryId: "01c73b60-2c6a-45f1-8dbf-88a5ce4ad179",
      status: ACTIVE
    }
    )
    {
      giftCardCollection
      {
        id
        name {
          en
          ar
        }
        country {
          id
         }
      }
    }
  }
  `;
  const result = await fetchGraphQL(query);
  expect(result).toMatchObject(
    expect.objectContaining({
      data: expect.objectContaining({
        giftCardCollectionSave: expect.objectContaining({
          giftCardCollection: expect.objectContaining({
            id: expect.any(String),
            name: expect.objectContaining({
              en: expect.any(String),
              ar: expect.any(String),
            }),
          }),
        }),
      }),
    })
  );
});
