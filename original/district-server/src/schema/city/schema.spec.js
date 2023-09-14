const { fetchGraphQL } = require('../../lib/test-util');

test('cities can resolve neighborhoods', async () => {
  const query = `{
    countries{
      cities {
        id
        neighborhoods{
          id
          name{
            en
            ar
          }
        }
      }
    }
  }`;

  const result = await fetchGraphQL(query);
  expect(result.data.countries[0].cities[0].neighborhoods[0].name.en).toEqual(
    'Abu Halifa'
  );
});
