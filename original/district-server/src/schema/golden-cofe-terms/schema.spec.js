const { fetchGraphQL } = require('../../lib/test-util');

test('get golden cofe details', async () => {
  const query = `
  {
    goldenCofe(countryCode: "KW") {
      brands {
        id
        name {
          en
        }
        profilePhoto
      }
      terms {
        en
        ar
      }
      dateRange {
        startDate
        endDate
      }
    }
  }`;

  const result = await fetchGraphQL(query);
  expect(result).toMatchObject(
    expect.objectContaining({
      data: expect.objectContaining({
        goldenCofe: expect.objectContaining({
          brands: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              name: expect.objectContaining({
                en: expect.any(String),
              }),
              profilePhoto: expect.any(Object),
            }),
          ]),
          terms: expect.arrayContaining([
            expect.objectContaining({
              en: expect.any(String),
              ar: expect.any(String),
            }),
          ]),
          dateRange: expect.objectContaining({
            endDate: expect.any(String),
            startDate: expect.any(String),
          }),
        }),
      }),
    })
  );
});

test('save golden cofe details', async () => {
  const query = `
  mutation {
    goldenCofeSave(goldenCofeInput: {
      countryCode: "KW",
      brandIds:["82f509cf-7600-4cf3-9ff4-4725e05591cc", "82b0cd94-54ca-4987-852e-e3cba0e012d2"],
      terms:[{en:"insert test - en", ar:"insert test - ar"}],
      imageUrl: {en: "en-image-1" ar: "ar-image-1"},
      dateRange: {startDate: "2019-09-01", endDate: "2019-09-26"}
    }) {
      brands {
        id
        name {
          en
        }
        profilePhoto
      }
      terms {
        en
        ar
      }
      dateRange {
        startDate
        endDate
      }
    }
  }`;
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});
