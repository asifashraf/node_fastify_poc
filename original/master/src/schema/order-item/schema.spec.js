const { fetchGraphQL } = require('../../lib/test-util');
const {
  sampleOrderSetId,
  orderItemDetails,
  menuItemDetails,
} = require('../../lib/test-fragments');

test('order sets resolve their order items', async () => {
  const query = `{
    orderSet(id: "${sampleOrderSetId}") {
      id
      items {
        ${orderItemDetails}
        menuItem {
          ${menuItemDetails}
        }
      }
    }
  }`;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});
