const { paymentServiceLogsByOrderIdErrors } = require('./enums');
const { formatError } = require('../../lib/util');
const { paymentLogsRequestType } = require('../../payment-service/enums');

module.exports = {
  Query: {
    async paymentLogsByOrderId(root, { orderId }, context) {
      const order = await context.orderSet.getById(orderId);
      if (!order) {
        return formatError(
          [paymentServiceLogsByOrderIdErrors.ORDER_NOT_FOUND],
          orderId
        );
      }
      const paymentLogs = await context.paymentServiceLog.getLogsByOrderId(
        orderId
      );
      if (paymentLogs.length === 0) {
        return formatError(
          [paymentServiceLogsByOrderIdErrors.NO_PAYMENT_LOG_FOUND],
          orderId
        );
      }
      const executionLog = paymentLogs.find(
        log => log.requestType === paymentLogsRequestType.EXECUTE_PAYMENT
      );
      const callbackLog = paymentLogs.find(
        log => log.requestType === paymentLogsRequestType.GET_PAYMENT_STATUS
      );
      // TODO find a better way to do this
      // if executionLog or callbackLog is null, then we got error
      // with this way, we protect undefined error
      if (executionLog) {
        executionLog.request = JSON.stringify(executionLog.request);
        executionLog.response = JSON.stringify(executionLog.response);
      }
      if (callbackLog) {
        callbackLog.request = JSON.stringify(callbackLog.request);
        callbackLog.response = JSON.stringify(callbackLog.response);
      }
      return {
        logs: {
          execution: executionLog,
          callback: callbackLog,
        },
      };
    },
  },
};
