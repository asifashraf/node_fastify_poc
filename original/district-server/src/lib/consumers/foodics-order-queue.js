const foodicsOrderQueueSqs = require('./../../lib/sqs-base')('foodics_order_queue');
const toFoodicsSqs = require('./../../lib/sqs-base')('to_foodics');

module.exports = function FoodicsOrderQueue(queryContext) {

  const getOrderData = async (orderSetId, context) => {
    const orderSet = await context.orderSet.getById(orderSetId);
    const orderFulfillment = await context.orderFulfillment.getByOrderSet(orderSet.id);
    const customer = await context.customer.getById(orderSet.customerId);
    orderSet['fulfillment'] = orderFulfillment;
    let orderSetItems = await context.orderItem.getByOrderSetId(orderSetId);
    orderSetItems = orderSetItems.map(async (item) => {
      const itemOptions = await context.orderItemOption.getAllForOrderItemId(item.id);
      item['options'] = itemOptions;
      return item;
    });
    orderSetItems = await Promise.all(orderSetItems);
    orderSet['items'] = orderSetItems;
    const orderData = {
      entity: 'order',
      orderSet,
      customer: {
        name: `${customer.firstName} ${customer.lastName}`,
        phone: customer.phoneNumber,
        email: customer.email,
        phoneCountry: customer.phoneCountry
      }
    };
    if (orderFulfillment.type === 'DELIVERY') {
      const fulfillmentId = await context.orderFulfillment.getFulfillmentIdByOrderSet(orderSet.id);
      const formattedAddress = await context.deliveryAddress.getFormattedDeliveryAddress(fulfillmentId);
      orderData['address'] = formattedAddress;
    }
    return orderData;
  };

  const _consumer = async ({ payload }) => {

    console.info('Foodics Queue Consumer > Payload >', payload);

    const { Body } = payload;

    let orderSetId = null;

    try {
      const _message = JSON.parse(Body);

      orderSetId = _message.orderSetId;

      const order = await getOrderData(orderSetId, queryContext);

      if (order.orderSet.paymentMethod !== 'CASH' && order.orderSet.paid === false) {
        foodicsOrderQueueSqs.sendMessage({
          orderSetId
        }, 3);
      } else {
        await toFoodicsSqs.sendMessage(order, 2);
      }

    } catch (ex) {
      queryContext.kinesisLogger.sendLogEvent(
        {
          orderSetId,
          error: ex?.message,
          stack: JSON.stringify(ex.stack || {}),
        },
        'foodics-order-queue-failure'
      );
    }

  };

  foodicsOrderQueueSqs.consume({ callback: _consumer });
};
