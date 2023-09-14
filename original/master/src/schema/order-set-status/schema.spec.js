const { fetchGraphQL } = require('../../lib/test-util');
const {
  sampleOrderSetId,
  orderSetStatusDetails,
  sampleRejectionInfo,
} = require('../../lib/test-fragments');

test('order set can resolve status', async () => {
  const query = `{
    orderSet(id: "${sampleOrderSetId}") {
        currentStatus
        statusHistory { ${orderSetStatusDetails} }
    }
  }`;
  // openInGraphiql(query);
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});

test('can set status for an order set', async () => {
  const mutation = `
    mutation SetStatus($orderSetId: ID!, $status: OrderSetStatusName!) {
      orderSetSetStatus(orderSetId: $orderSetId, status: $status) {
        orderSetStatus{
          id
        }
      }
    }
  `;

  const variables = {
    orderSetId: sampleOrderSetId,
    status: 'ACCEPTED',
  };

  const result = await fetchGraphQL(mutation, variables);
  expect(result).toMatchSnapshot();
});

test('can reject an order set', async () => {
  const preMutation = `
    mutation SetStatus($orderSetId: ID!, $status: OrderSetStatusName!) {
      orderSetSetStatus(orderSetId: $orderSetId, status: $status) {
        orderSetStatus{
          id
        }
      }
    }
  `;

  const preVariables = {
    orderSetId: sampleOrderSetId,
    status: 'ACCEPTED',
  };

  // NOTE: this guarantees that our status is not rejected
  await fetchGraphQL(preMutation, preVariables);

  const mutation = `
    mutation CreateRejection($orderSetId: ID!, $rejectionInfo: RejectionInput!) {
      orderSetCreateRejection(orderSetId: $orderSetId, rejectionInfo: $rejectionInfo) {
        id
      }
    }
  `;

  const variables = {
    orderSetId: sampleOrderSetId,
    rejectionInfo: sampleRejectionInfo,
  };

  // openInGraphiql(query);
  const result = await fetchGraphQL(mutation, variables);
  expect(result).toMatchSnapshot();
});

test('can un-reject an order set', async () => {
  // Make Sure we have a previous State
  const acceptMutation = `
    mutation SetStatus($orderSetId: ID!, $status: OrderSetStatusName!) {
      orderSetSetStatus(orderSetId: $orderSetId, status: $status) {
        orderSetStatus{
          id
        }
      }
    }
  `;

  const acceptVariables = {
    orderSetId: sampleOrderSetId,
    status: 'ACCEPTED',
  };

  await fetchGraphQL(acceptMutation, acceptVariables);

  const preMutation = `
    mutation SetStatus($orderSetId: ID!, $status: OrderSetStatusName!) {
      orderSetSetStatus(orderSetId: $orderSetId, status: $status) {
        orderSetStatus{
          id
        }
      }
    }
  `;

  const preVariables = {
    orderSetId: sampleOrderSetId,
    status: 'REJECTED',
  };

  // NOTE: this guarantees that our status is rejected
  await fetchGraphQL(preMutation, preVariables);

  const mutation = `
    mutation UndoRejection($orderSetId: ID!) {
      orderSetUndoRejection(orderSetId: $orderSetId) {
        id
      }
    }
  `;

  const variables = {
    orderSetId: sampleOrderSetId,
  };

  // openInGraphiql(query);
  const result = await fetchGraphQL(mutation, variables);
  expect(result).toMatchSnapshot();
});
