const { fetchGraphQL } = require('../../lib/test-util');
const {
  sampleOrderSetId,
  orderSetCommentDetails,
} = require('../../lib/test-fragments');

test('order set can resolve comments', async () => {
  const query = `{
    orderSet(id: "${sampleOrderSetId}") {
        comments { ${orderSetCommentDetails} }
    }
  }`;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('can add a comment for an order set', async () => {
  const mutation = `
      mutation orderSetCommentAdd($orderSetComment: OrderSetCommentInput!)  {
      orderSetCommentAdd(orderSetComment: $orderSetComment) {
        error
        orderSetComment {
          userName
          userName
          comment
        }
      }
    }
  `;

  const variables = {
    orderSetComment: {
      orderSetID: sampleOrderSetId,
      type: 'REQUEST',
      comment: 'This is a Test Comment',
    },
    __user: {
      id: 'testUserId',
      name: 'Tester McTesty',
      email: 'john@sky.net',
    },
  };

  const result = await fetchGraphQL(mutation, variables);
  expect(result).toMatchSnapshot();
});
