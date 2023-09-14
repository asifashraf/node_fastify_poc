const sqs = require('./../../lib/sqs-base')('cSubscription');
const { basePath, cSubscription } = require('../../../config');

module.exports = function FinishCustomerSubscriptionConsumer(queryContext) {
  const sqsConsumer = async ({ payload }) => {
    try {
        const { Body } = payload;
        const messageBody = JSON.parse(Body);

        const response = await axios.get(`${basePath}/c-subscription/finish-customer-subscription`, {
                headers: {'api-key': cSubscription.restEndpointsApiKey},
                params: messageBody,
        });

        if (response.data.status || response.data.error === 'NO_SUBSCRIPTION_FOUND') {
            return retryList;
        }
        const retryList = [];
        retryList.push({
            DelaySeconds: 0,
            MessageBody: JSON.stringify(response.config.params),
        });
        if (retryList.length > 0) {
            // normally if lambda doesn't get exception it deletes messages from
            // queue but in getting multiple type of response case it sends uncompleted
            // process to queue again
            await sqs.sendMessage(retryList);
        }
    } catch (ex) {
      const { stack, message } = ex || {};
      queryContext.kinesisLogger.sendLogEvent(
        { stack, message },
        'finish-customer-subscription-consumer-exception'
      );
    }
  };
  sqs.consume({ callback: sqsConsumer });
};
