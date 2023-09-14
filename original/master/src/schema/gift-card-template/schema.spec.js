const { fetchGraphQL } = require('../../lib/test-util');

test('giftCardTemplates', async () => {
  const query = `
  {
    giftCardTemplates(
      paging: {offset: 0, limit: 100}
      filters: {
        status: ACTIVE,
        searchText: "1",
        countryId: "01c73b60-2c6a-45f1-8dbf-88a5ce4ad179",
        collectionId: "cc451fc7-3627-4bdd-bcab-c32b20568925",
        brandId: "623c9dfc-f2e8-4800-89d8-9f202f6b7f0e",
        currencyId: "f216d955-0df1-475d-a9ec-08cb6c0f92bb"
      }
    )
    {
      items {
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
  }
  `;
  const result = await fetchGraphQL(query);
  expect(result).toMatchObject(
    expect.objectContaining({
      data: expect.objectContaining({
        giftCardTemplates: expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              name: expect.objectContaining({
                en: expect.any(String),
                ar: expect.any(String),
              }),
              collection: expect.objectContaining({
                id: expect.any(String),
                country: expect.objectContaining({
                  id: expect.any(String),
                  name: expect.objectContaining({
                    en: expect.any(String),
                    ar: expect.any(String),
                  }),
                }),
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
          ]),
        }),
      }),
    })
  );
});

test('giftCardTemplate', async () => {
  const query = `
  {
    giftCardTemplate(id: "cc451fc7-9138-4bdd-bcab-c32b20568923")
    {
        id
        isFeatured
        name {
          en
          ar
        }
        availableFrom
        availableUntil
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
        giftCardTemplate: expect.objectContaining({
          id: expect.any(String),
          isFeatured: expect.any(Boolean),
          name: expect.objectContaining({
            en: expect.any(String),
            ar: expect.any(String),
          }),
          collection: expect.objectContaining({
            id: expect.any(String),
            country: expect.objectContaining({
              id: expect.any(String),
              name: expect.objectContaining({
                en: expect.any(String),
                ar: expect.any(String),
              }),
            }),
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
      }),
    })
  );
});

test('giftCardTemplate mutation', async () => {
  const query = `
  mutation {
    giftCardTemplateSave
      (giftCardTemplate:
        {
          name:{
            en: "test name",
            ar: "test name ar"
          },
          imageUrl:{
            en: "test image",
            ar: "test image ar"
          },
          minLimit: 10
          maxLimit: 20
          isFeatured: true
          giftCardCollectionId: "cc451fc7-3627-4bdd-bcab-c32b20568925"
          countryId: "01c73b60-2c6a-45f1-8dbf-88a5ce4ad179",
          currencyId: "f216d955-0df1-475d-a9ec-08cb6c0f92bb",
          brandId: "623c9dfc-f2e8-4800-89d8-9f202f6b7f0e",
          availableFrom: "2021-11-16T01:20:45+01:00",
          availableUntil: "2022-11-16T01:20:45+01:00",
          timeZoneIdentifier: "Asia/Kuwait",
          status: ACTIVE
        }
    )
    {
      giftCardTemplate
      {
        id
        name {
          en
          ar
        }
        maxLimit
        minLimit
      }
    }
  }
  `;
  const result = await fetchGraphQL(query);
  expect(result).toMatchObject(
    expect.objectContaining({
      data: expect.objectContaining({
        giftCardTemplateSave: expect.objectContaining({
          giftCardTemplate: expect.objectContaining({
            id: expect.any(String),
            name: expect.objectContaining({
              en: expect.any(String),
              ar: expect.any(String),
            }),
            minLimit: 10,
            maxLimit: 20,
          }),
        }),
      }),
    })
  );
});

test('giftCardTemplate mutation update', async () => {
  const query = `
  mutation {
    giftCardTemplateSave
      (giftCardTemplate:
        {
          id:"cc451fc7-9138-4bdd-bcab-c32b20568923",
          name:{
            en: "test name",
            ar: "test name ar"
          },
          imageUrl:{
            en: "test image",
            ar: "test image ar"
          },
          minLimit: 10
          maxLimit: 20
          isFeatured: true
          giftCardCollectionId: "cc451fc7-3627-4bdd-bcab-c32b20568925"
          countryId: "01c73b60-2c6a-45f1-8dbf-88a5ce4ad179",
          currencyId: "f216d955-0df1-475d-a9ec-08cb6c0f92bb",
          brandId: null,
          availableFrom: "2021-11-16T01:20:45+01:00",
          availableUntil: "2022-11-16T01:20:45+01:00",
          timeZoneIdentifier: "Asia/Kuwait",
          status: ACTIVE
        }
    )
    {
      giftCardTemplate
      {
        id
        name {
          en
          ar
        }
        maxLimit
        minLimit
        brand{
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
        giftCardTemplateSave: expect.objectContaining({
          giftCardTemplate: expect.objectContaining({
            id: expect.any(String),
            brand: null,
            name: expect.objectContaining({
              en: expect.any(String),
              ar: expect.any(String),
            }),
            minLimit: 10,
            maxLimit: 20,
          }),
        }),
      }),
    })
  );
});
