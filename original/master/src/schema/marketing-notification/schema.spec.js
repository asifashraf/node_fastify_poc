const { fetchGraphQL, getFirstId } = require('../../lib/test-util');
const { now } = require('../../lib/util');
const moment = require('moment');
const sqs = require('../../lib/sqs');

sqs.receiveMessage = jest.fn().mockImplementation(() => Promise.resolve('ok'));
sqs.sendMessage = jest.fn().mockImplementation(() => Promise.resolve('ok'));
sqs.deleteMessage = jest.fn().mockImplementation(() => Promise.resolve('ok'));

test('create new marketing notification for ALL TARGETS', async () => {
  const mutation = `mutation {
    marketingNotificationSave(
      notification:
      {
        embargoDate: "${moment(now.get())
          .add(1, 'days')
          .toISOString()}"
          title: "24% Off"
          message: "Hello All, there's a 24% discount!"
          targetAll: true
          targetAndroid: false
          targetIos: false
          countryId:"01c73b60-2c6a-45f1-8dbf-88a5ce4ad179"
        }) {
          error
          errors
          notification {
            id
            targetAll
            targetIos
            targetAndroid
            embargoDate
          }
        }
      }`;
  const result = await fetchGraphQL(mutation);
  expect(result).toMatchSnapshot();
});

test('delete a marketing notification by id', async () => {
  const { id } = await getFirstId('marketing_notifications');

  const mutation = `mutation {
    marketingNotificationDelete(id:"${id}")
  }`;
  const result = await fetchGraphQL(mutation);
  expect(result).toMatchSnapshot();
});

test('get marketing notifications', async () => {
  const query = `{
    marketingNotifications {
      numResults
      notifications {
        id
        title
        message
        targetAll
        targetIos
        targetAndroid
        embargoDate
      }
    }
  }`;
  const result = await fetchGraphQL(query);
  expect(result).toMatchSnapshot();
});
