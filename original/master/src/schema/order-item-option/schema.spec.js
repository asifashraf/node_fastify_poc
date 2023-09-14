const { fetchGraphQL } = require('../../lib/test-util');
const {
  sampleOrderSetId,
  orderItemOptionDetails,
} = require('../../lib/test-fragments');

test('order items resolve their order item options', async () => {
  const query = `{
    orderSet(id: "${sampleOrderSetId}") {
      id
      items {
          selectedOptions {
            ${orderItemOptionDetails}
          }
      }
    }
  }`;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('order item options resolve their currency', async () => {
  const query = `{
    orderSet(id: "${sampleOrderSetId}") {
      id
      items {
          selectedOptions {
            currency {
              id
              symbol {
                en
                ar
              }
            }
          }
      }
    }
  }`;
  const {
    data: { orderSet },
  } = await fetchGraphQL(query);
  expect(orderSet.items[0].selectedOptions[0]).toHaveProperty(
    'currency.id',
    'f216d955-0df1-475d-a9ec-08cb6c0f92bb'
  );
});
