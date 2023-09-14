const { fetchGraphQL, getFirstId } = require('../../lib/test-util');
const { notificationSettingsDetails } = require('../../lib/test-fragments');

test('customer can resolve notification settings ', async () => {
  const { id: customerId } = await getFirstId('customers');

  const query = `{
    customer(id: "${customerId}") {
        notificationSettings { ${notificationSettingsDetails} }
      }
    }`;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});
