const { fetchGraphQL } = require('../../lib/test-util');

test('get allergens', async () => {
  const query = `{
    allergens {
      id
      name
    }
  }`;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});
