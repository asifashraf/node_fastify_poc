const sqs = require("./../../lib/sqs-base")("checkInconsistentData");
const { filter, find } = require('lodash');
const Axios = require('axios');
const { slackHostURL, slackWebHookUrlPath } = require('../../../config');
const axios = Axios.create({
    baseURL: slackHostURL,
    timeout: 6000,
});
const moment = require('moment');
const ControlProviders = {
  SUBSCRIPTION: 'SUBSCRIPTION',
};

module.exports = function CheckInconsistentData(queryContext) {
  const sqsConsumer = async ({ sqsMessage }) => {
    try {
      if (!sqsMessage) {
        console.log("SQS message is empty.");
        return;
      }
      if (!sqsMessage.Records) {
        console.log("SQSMessage.records is empty: ", sqsMessage);
        return;
      }

      for (const record of sqsMessage.Records) {
        const { body } = record;
        const messageBody = JSON.parse(body);
        if (!messageBody) {
          console.log("SQSMessage body is empty.");
          return;
        }
        if (!Array.isArray(messageBody.controlProvider)) {
          messageBody.controlProvider = [messageBody.controlProvider];
        }
        for (const provider of messageBody.controlProvider) {
          const event = {
            data: messageBody.data,
            controlProvider: provider,
          };
          switch (event.controlProvider) {
            case ControlProviders.SUBSCRIPTION:
                return await checkInconsistentData(queryContext, event.controlProvider, event.data);
            default:
                console.log("Unrecognized or unprocessed analytics provider", eventProvider);
          }
        }
      }
    } catch (ex) {
      const { stack, message } = ex || {};
      queryContext.kinesisLogger.sendLogEvent(
        { stack, message },
        "check-inconsistent-data-consumer-exception"
      );
    }
  };
  sqs.consume({ callback: sqsConsumer });
};

async function isFinished(subscriptionCustomer, transactions) {
    if (subscriptionCustomer.status === 'INACTIVE') {
        const subscriptionFilteredTransactions = filter(transactions, transaction => transaction.subscriptionCustomerId == subscriptionCustomer.id);
        if (find(subscriptionFilteredTransactions, t => t.actionType == 'FINISHED') == -1) {
            await sendNotification("Wrong finish for subscription for subscriptionCustomerId: " + subscriptionCustomer.id);
            return false;
        }
        return true;
    }
    return false;
}

async function isPerDayAmountExceed(subscriptionCustomer, lastTransaction) {
    if (lastTransaction.debit != 0 && lastTransaction.debit > subscriptionCustomer.perDayCupsCount) {
        await sendNotification("Per day amount exceed for subscriptionCustomerId: " + subscriptionCustomer.id);
        return true;
    }
    return false;
}

async function isPerOrderAmountExceed(subscriptionCustomer, lastTransaction) {
    if (lastTransaction.debit != 0 && lastTransaction.debit > subscriptionCustomer.perOrderMaxCupsCount) {
        await sendNotification("Per order amount exceed for subscriptionCustomerId: " + subscriptionCustomer.id);
        return true;
    }
    return false;
}

async function isRemainingCupsNegative(remainingCupsCount, subscriptionCustomerId) {
    if (remainingCupsCount < 0) {
        await sendNotification("Negative Cups Detected for subscriptionCustomerId: " + subscriptionCustomerId);
        return true;
    }
    return false;
}

async function isOrderWrongRefunded(queryContext, transactions) {
    const refundedOrders = filter(transactions, t => t.actionType == 'ORDER_REFUNDED');
    for (const refundedOrder of refundedOrders) {
        const transaction = queryContext.db
            .table('subscription_customer_transactions')
            .where('reference_order_id', refundedOrder.referenceOrderId)
            .where('action_type', 'ORDER_PLACED')
            .where('debit', refundedOrder.credit);
        if (!transaction || transaction.length == 0) {
            await sendNotification("NWrong order refunded for subscriptionCustomerId: " + refundedOrder.subscriptionCustomerId);
        }
    }
    return false;
}

async function isExpirationDateChanged(subscriptionCustomer, lastTransaction) {
    const expiryDate = moment(subscriptionCustomer.created)
        .add(subscriptionCustomer.periodInMinutes, 'minutes');
    const newExpiryDate = moment(lastTransaction.created)
        .add(lastTransaction.remainingMinutes, 'minutes');
    const duration = moment.duration(expiryDate.diff(newExpiryDate));
    let differenceInMinutes = duration.asMinutes();
    if (differenceInMinutes > 1) {
        await sendNotification("Expiration data change detected for subscriptionCustomerId: " + subscriptionCustomer.id);
        return true;
    }
    return false;
}


async function checkInconsistentData(queryContext, data) {
    const subscriptionCustomer = await queryContext.db
        .table('subscription_customers')
        .where('customer_id', data.customerId)
        .where('subscription_id', data.subscriptionId)
        .orderBy('created', 'desc')
        .first();
    const subscriptionCustomerTransactions = await queryContext.db
        .table('subscription_customer_transactions')
        .where('customer_id', data.customerId)
        .where('subscription_id', data.subscriptionId)
        .orderBy('sequence', 'desc');
    await isPerDayAmountExceed(subscriptionCustomer, subscriptionCustomerTransactions[0]);
    await isPerOrderAmountExceed(subscriptionCustomer, subscriptionCustomerTransactions[0]);
    await isRemainingCupsNegative(subscriptionCustomerTransactions[0].remainingCups, subscriptionCustomer.id);
    await isFinished(subscriptionCustomer, subscriptionCustomerTransactions);
    await isOrderWrongRefunded(queryContext, subscriptionCustomerTransactions);
    await isExpirationDateChanged(subscriptionCustomer, subscriptionCustomerTransactions[0]);
    return true;
}

async function sendNotification(notificationBody) {
    try {
        const res = await axios.post(slackWebHookUrlPath, {
            text: '```' + JSON.stringify(notificationBody) + '```',
        });
    } catch (err) {
        throw err;
    }
    return true;
}
