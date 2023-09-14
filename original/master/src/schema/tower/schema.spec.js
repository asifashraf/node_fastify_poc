const {
  fetchGraphQL,
  // openInGraphiql,
} = require('../../lib/test-util');

test('can query for towers', async () => {
  const query = `{
    config {
      towers {
        id
        name
      }
    }
  }
  `;

  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});
