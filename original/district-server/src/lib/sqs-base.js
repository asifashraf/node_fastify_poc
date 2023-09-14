const AWS = require('aws-sdk');
const SlackWebHookManager = require('../schema/slack-webhook-manager/slack-webhook-manager');

module.exports = function (type) {
  const {
    sqsRegion,
    awsAccessKeyId: accessKeyId,
    awsSecretAccessKey: secretAccessKey,
    sqsQueueUrl,
    apiVersion,
  } = require('../../config')[type];

  const sqs = new AWS.SQS({
    apiVersion: apiVersion ? apiVersion : '2012-11-05',
    accessKeyId,
    secretAccessKey,
    region: sqsRegion,
  });

  const params = {
    QueueUrl: sqsQueueUrl,
    DelaySeconds: 0,
  };

  async function consume({ callback }) {
    const _listen = async () => {
      try {
        let response = await sqs
          .receiveMessage({
            AttributeNames: [
              'SentTimestamp'
            ],
            MaxNumberOfMessages: 1,
            MessageAttributeNames: [
              'All'
            ],
            QueueUrl: params.QueueUrl,
            WaitTimeSeconds: 20
          })
          .promise();
        response = response.Messages ? response.Messages[0] : null;

        if (response === null) {
          _listen();
        } else {
          sqs.deleteMessage({
            QueueUrl: params.QueueUrl,
            ReceiptHandle: response.ReceiptHandle,
          }).promise();

          callback({ payload: response });

          _listen();
        }
      } catch (ex) {
        SlackWebHookManager.sendTextToSlack(
          `
[!!!SQS-BASE-CONSUMER-EXCEPTION!!!]
Stack Trace: ${ex?.stack || ex?.message}`);
      }
    };
    return _listen();
  }

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

  function sendMessage(message, delay = 0) {
    console.log(JSON.stringify(message));
    params.DelaySeconds = delay;
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

  return {
    consume,
    sqs,
    receiveMessage,
    sendMessage,
    deleteMessage,
  };
};
