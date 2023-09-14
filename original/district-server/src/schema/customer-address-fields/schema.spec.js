const { fetchGraphQL } = require('../../lib/test-util');

test('get all fields by country code', async () => {
  const query = `
  {
    countries
    {
      addressFields {
        id
        order
        title {
          en
          ar
        }
        type
        isRequired
      }
    }
  }`;
  const result = await fetchGraphQL(query);
  expect(result).toEqual(
    expect.objectContaining({
      data: expect.objectContaining({
        countries: expect.arrayContaining([
          {
            addressFields: expect.arrayContaining([
              expect.objectContaining({
                id: expect.any(String),
                title: expect.objectContaining({
                  en: expect.any(String),
                  ar: expect.any(String),
                }),
                type: expect.any(String),
                isRequired: expect.any(Boolean),
                order: expect.any(Number),
              }),
            ]),
          },
        ]),
      }),
    })
  );
});

test('save custome address fields', async () => {
  const query = `
  mutation {
    addressFieldsSave(addressFieldInput: {
      countryCode: "KW",
      fields:[{
        id: "cc451fc7-6585-4bdd-bcab-c32b20568924"
        title: {
          en: "test",
          ar: "test- ar",
        },
        type: EMAIL,
        isRequired: true,
        order: 500
      },
      {
        title: {
          en: "test 2",
          ar: "test 2 - ar",
        },
        type: NOTE,
        isRequired: true,
        order: 600
      },
      {
        id: "141afd5c-b04e-47cc-b67b-b6b57ac3702c",
        deleted: true
      }
    ]
    }) {
      addressFields {
        id
        title {
          en
          ar
        }
        type
        isRequired
        order
    }
  }}`;
  const result = await fetchGraphQL(query);
  expect(result).toEqual(
    expect.objectContaining({
      data: expect.objectContaining({
        addressFieldsSave: expect.objectContaining({
          addressFields: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              title: expect.objectContaining({
                en: expect.any(String),
                ar: expect.any(String),
              }),
              type: expect.any(String),
              isRequired: expect.any(Boolean),
              order: expect.any(Number),
            }),
          ]),
        }),
      }),
    })
  );
});
