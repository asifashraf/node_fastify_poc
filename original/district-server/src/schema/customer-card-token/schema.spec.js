const { fetchGraphQL } = require('../../lib/test-util');
const { transformToCamelCase } = require('../../lib/util');
const { customerCardTokens } = require('../../../database/seeds/development');

test('customer card token can be fetched and can resolve customer', async () => {
  const [cardToken] = transformToCamelCase(customerCardTokens);
  const mut = `{
    customerCardToken(id: "${cardToken.id}") {
      id
      customer {
        id
      }
    }
  }`;

  const response = await fetchGraphQL(mut);
  const {
    data: { customerCardToken },
  } = response;
  expect(customerCardToken).toHaveProperty('id');
  expect(customerCardToken.customer).toHaveProperty('id', cardToken.customerId);
});
