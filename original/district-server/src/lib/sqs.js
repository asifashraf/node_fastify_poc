const AWS = require('aws-sdk');

const {
  sqsRegion,
  snsSesAccessKeyId: accessKeyId,
  snsSesSecretAccessKey: secretAccessKey,
  sqsQueueUrl,
} = require('../../config').notifications;

const sqs = new AWS.SQS({
  apiVersion: '2012-11-05',
  accessKeyId,
  secretAccessKey,
  region: sqsRegion,
});

const params = {
  QueueUrl: sqsQueueUrl,
};

async function receiveMessage() {
  const response = await sqs
    .receiveMessage({
      ...params,
      MaxNumberOfMessages: 1,
      VisibilityTimeout: 3,
      WaitTimeSeconds: 0,
    })
    .promise();
  return response.Messages ? response.Messages[0] : null;
}

function sendMessage(message) {
  return sqs
    .sendMessage({
      ...params,
      MessageBody: JSON.stringify(message),
    })
    .promise();
}

function deleteMessage(receiptHandle) {
  return sqs
    .deleteMessage({
      ...params,
      ReceiptHandle: receiptHandle,
    })
    .promise();
}

module.exports = {
  sqs,
  receiveMessage,
  sendMessage,
  deleteMessage,
};