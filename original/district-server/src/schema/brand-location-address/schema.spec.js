const { fetchGraphQL, getFirstId } = require('../../lib/test-util');
const { brandLocationAddressDetails } = require('../../lib/test-fragments');

test('brand locations can resolve address', async () => {
  const { id: brandLocationId } = await getFirstId('brand_locations');

  const query = `{
    brandLocation(id: "${brandLocationId}") {
      address { ${brandLocationAddressDetails} }
    }
}  `;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});
