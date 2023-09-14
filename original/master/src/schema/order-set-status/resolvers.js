const { first } = require('lodash');
const { orderSetStatusNames } = require('../../schema/root/enums');
const { orderFulfillmentTypes } = require('../order-set/enums');

module.exports = {
  OrderSetStatus: {
    async createdBy({ id }, args, context) {
      return first(await context.userActivityLog.getUserByStreamId(id));
    },
  },
  Query: {
    async getNextStatus(root, { currentStatus, fulfillmentType }, context) {
      let nextStatus = null;
      switch (currentStatus) {
        case orderSetStatusNames.PLACED:
          nextStatus = orderSetStatusNames.ACCEPTED;
          break;
        case orderSetStatusNames.ACCEPTED:
          nextStatus = orderSetStatusNames.PREPARING;
          break;
        case orderSetStatusNames.PREPARING:
          nextStatus = [orderFulfillmentTypes.PICKUP, orderFulfillmentTypes.CAR, orderFulfillmentTypes.DELIVERY].includes(fulfillmentType) ?
            orderSetStatusNames.PREPARED : orderSetStatusNames.WAITING_FOR_COURIER;
          break;
        case orderSetStatusNames.PREPARED:
          nextStatus = [orderFulfillmentTypes.PICKUP, orderFulfillmentTypes.CAR].includes(fulfillmentType) ?
            orderSetStatusNames.READY_FOR_PICKUP : orderSetStatusNames.WAITING_FOR_COURIER;
          break;
        case orderSetStatusNames.READY_FOR_PICKUP:
          nextStatus = orderSetStatusNames.COMPLETED;
          break;
        case orderSetStatusNames.WAITING_FOR_COURIER:
          nextStatus = orderSetStatusNames.OUT_FOR_DELIVERY;
          break;
        case orderSetStatusNames.OUT_FOR_DELIVERY:
          nextStatus = orderSetStatusNames.DELIVERED;
          break;
        case orderSetStatusNames.DELIVERED:
          nextStatus = orderSetStatusNames.COMPLETED;
          break;
        default:
          break;
      }
      return nextStatus;
    }
  }
};
