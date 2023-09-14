const { fetchGraphQL, getFirstId } = require('../../lib/test-util');

test('brand locations can resolve available fulfillment', async () => {
  const { id: brandLocationId } = await getFirstId('brand_locations');

  const query = `{
    brandLocation(id: "${brandLocationId}") {
      availableFulfillments
    }
}  `;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(
    result.data.brandLocation.availableFulfillments.length
  ).toBeGreaterThan(0);
});
