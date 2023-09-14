const {
  fetchGraphQL,
  getFirstId,
  // openInGraphiql,
} = require('../../lib/test-util');
const { neighborhoodDetails } = require('../../lib/test-fragments');
const {
  neighborhoods: [{ id: neighborhoodId }],
} = require('../../../database/seeds/development');

test('brand locations can resolve neighborhoods', async () => {
  const { id: brandLocationId } = await getFirstId('brand_locations');

  const query = `{
    brandLocation(id: "${brandLocationId}") {
        neighborhoods { ${neighborhoodDetails} }
      }
    }`;

  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('configuration can resolve neighborhoods', async () => {
  const query = `{
    config {
      neighborhoods { ${neighborhoodDetails} }
    }
  }`;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('can resolve all neighborhoods', async () => {
  const query = `{
    neighborhoods { ${neighborhoodDetails} }
  }`;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('locationsForHomeScreen can filter by neighborhoodId', async () => {
  const query = `{
    locationsForHomeScreen(neighborhoodId: "${neighborhoodId}") {
      neighborhoods { ${neighborhoodDetails} }
    }
}  `;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});
