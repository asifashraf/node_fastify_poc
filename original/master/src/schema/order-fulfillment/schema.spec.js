const { fetchGraphQL } = require('../../lib/test-util');
const {
  sampleCustomerId,
  sampleOrderSetId,
  orderFulfillmentDetails,
} = require('../../lib/test-fragments');

test('orders can resolve their fulfillments', async () => {
  const query = `{
    customer(id: "${sampleCustomerId}") {
      orderSets {
        fulfillment {
          ${orderFulfillmentDetails}
        }
      }
    }
  }`;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('order fulfillment can reveal that a customer is present', async () => {
  const mutation = `
mutation {
  setCustomerIsPresent(orderSetId: "${sampleOrderSetId}") {
    error
    orderSet {
      fulfillment {
        ${orderFulfillmentDetails}
      }
    }
      
  }
}
`;
  const {
    data: {
      setCustomerIsPresent: { orderSet },
    },
  } = await fetchGraphQL(mutation);
  expect(orderSet.fulfillment.isCustomerPresent).toEqual(true);
});
