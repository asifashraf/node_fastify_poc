module.exports = function () {
  const ORDER_STATUSES = {
    '3': 'REJECTED',
    '2': 'ACCEPTED',
    '4': 'COMPLETED',
    '5': 'REPORTED',
    '7': 'REPORTED',
  };
  return async function ({ data, qContext, dbContext }) {
    const { cofe_order_id, status, event } = data;

    if (event && event !== '') {
      const { reason } = data;

      await qContext.internalComment.save([{
        userName: 'Foodics Service',
        comment: reason,
      }], cofe_order_id);

      if (event === 'ORDER_CREATION_EXCEPTION') throw new Error(reason);

      return { message: null, done: true };
    }

    let orderStatus = status.toString();

    orderStatus = ORDER_STATUSES[orderStatus];

    if (orderStatus === 'REPORTED') {
      const reasons = {
        '5': 'Order was returned as received from Foodics',
        '7': 'Order was void as received from Foodics',
      };
      await qContext.internalComment.save([{
        userName: 'Foodics Service',
        comment: reasons[status.toString()],
      }], cofe_order_id);
    }

    await dbContext.setStatusForOrderSetId(
      cofe_order_id,
      orderStatus,
      qContext
    );

    return { message: null, done: true };
  };
}();
