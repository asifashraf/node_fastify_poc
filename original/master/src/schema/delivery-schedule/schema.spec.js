const { fetchGraphQL, getFirstId } = require('../../lib/test-util');
const { weeklyScheduleDetails } = require('../../lib/test-fragments');

test('brand locations can resolve weeklySchedule', async () => {
  const { id: brandLocationId } = await getFirstId('brand_locations');

  const query = `{
    brandLocation(id: "${brandLocationId}") {
      weeklySchedule { ${weeklyScheduleDetails} }
    }
  }`;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('brand locations can resolve deliverySchedule based on weeklySchedule', async () => {
  const { id: brandLocationId } = await getFirstId('brand_locations');

  const query = `{
    brandLocation(id: "${brandLocationId}") {
      weeklySchedule { ${weeklyScheduleDetails} }
      deliverySchedule { ${weeklyScheduleDetails} }
    }
  }`;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});
