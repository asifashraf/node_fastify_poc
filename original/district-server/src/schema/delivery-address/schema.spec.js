const { fetchGraphQL } = require('../../lib/test-util');
const {
  sampleCustomerId,
  deliveryAddressDetails,
} = require('../../lib/test-fragments');

test('order fulfillments can resolve their delivery addresses', async () => {
  const query = `{
    customer(id: "${sampleCustomerId}") {
      orderSets {
        fulfillment {
          deliveryAddress {
            ${deliveryAddressDetails}
          }
        }
      }
    }
  }`;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});
