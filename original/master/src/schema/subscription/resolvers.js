const { pubsub } = require('../../lib/util');
const { withFilter } = require('graphql-subscriptions');

const {
  orderSetSubscriptionEvent,
  storeOrderSetSubscriptionEvent,
  storeOrderSubscriptionEvent,
  mposOrderSubscriptionEvent,
  arrivedOrderSubscriptionEvent,
  operatingHourChangeEvent,
} = require('../root/enums');

const {calculateArrivedOrderKey, saveCachedArrivedOrder} = require('../brand-location-device/redis-helper');
const SlackWebHookManager = require(
  '../slack-webhook-manager/slack-webhook-manager'
);

module.exports = {
  Subscription: {
    orderSetEvent: {
      subscribe: () => {
        pubsub.init();
        return pubsub.instance.asyncIterator([
          orderSetSubscriptionEvent.ORDER_SET_CREATED,
          orderSetSubscriptionEvent.ORDER_SET_UPDATED,
        ]);
      },
      resolve: async (payload, args, context) => {
        const { orderSet, event } = payload;
        //const orderSet = await context.orderSet.getById(orderSetId);
        return {
          event,
          orderSet,
        };
      },
    },
    orderSetEventByBrand: {
      subscribe: withFilter(
        // eslint-disable-next-line no-unused-vars
        (_, __) => {
          pubsub.init();
          return pubsub.instance.asyncIterator([
            orderSetSubscriptionEvent.ORDER_SET_CREATED,
            orderSetSubscriptionEvent.ORDER_SET_UPDATED,
          ]);
        },
        (payload, variables) => {
          // Only push an update if the brandId matches the provided one
          return payload.brandId === variables.brandId;
        }
      ),
      resolve: async (payload, args, context) => {
        const { orderSet, event } = payload;
        return {
          event,
          orderSet,
        };
      },
    },
    orderSetEventByBrandLocation: {
      subscribe: withFilter(
        // eslint-disable-next-line no-unused-vars
        (_, __) => {
          pubsub.init();
          return pubsub.instance.asyncIterator([
            orderSetSubscriptionEvent.ORDER_SET_CREATED,
            orderSetSubscriptionEvent.ORDER_SET_UPDATED,
          ]);
        },
        // payload is the payload of the event that was published.
        // variables is an object containing all arguments the client provided when initiating their subscription.
        (payload, variables) => {
          // Only push an update if the brandId matches the provided one
          return payload.brandLocationId === variables.brandLocationId;
        }
      ),
      resolve: async (payload, args, context) => {
        const { orderSet, event } = payload;
        return {
          event,
          orderSet,
        };
      },
    },
    storeOrderSetEvent: {
      subscribe: () => {
        pubsub.init();
        return pubsub.instance.asyncIterator([
          storeOrderSetSubscriptionEvent.STORE_ORDER_SET_CREATED,
          storeOrderSetSubscriptionEvent.STORE_ORDER_SET_UPDATED,
        ]);
      },
      resolve: async (payload, args, context) => {
        const { storeOrderSetId, event } = payload;
        console.log('storeOrderSetEvent', storeOrderSetId);

        const storeOrderSet = await context.storeOrderSet.getById(
          storeOrderSetId
        );
        return {
          event,
          storeOrderSet,
        };
      },
    },
    storeOrderEvent: {
      subscribe: () => {
        pubsub.init();
        return pubsub.instance.asyncIterator([
          storeOrderSubscriptionEvent.STORE_ORDER_CREATED,
          storeOrderSubscriptionEvent.STORE_ORDER_UPDATED,
        ]);
      },
      resolve: async (payload, args, context) => {
        const { storeOrderId, event } = payload;
        console.log('storeOrderEvent', storeOrderId);
        const storeOrder = await context.storeOrder.getById(storeOrderId);
        return {
          event,
          storeOrder,
        };
      },
    },
    mposOrderEvent: {
      subscribe: withFilter(
        // eslint-disable-next-line no-unused-vars
        (_, filter) => {
          if (filter.deviceId) {
            pubsub.init();
            return pubsub.instance.asyncIterator([
              mposOrderSubscriptionEvent.NEW_ORDER,
              mposOrderSubscriptionEvent.ARRIVED_ORDER,
              mposOrderSubscriptionEvent.COMPLETED_ORDER,
            ]);
          }
        },
        async (payload, variables) => {
          // Only push an update if the brandId matches the provided one
          try {
            if (payload.order.deviceId === variables.deviceId) {
              const redisKey = calculateArrivedOrderKey(payload.order.orderSetId);
              await saveCachedArrivedOrder(redisKey);
            }
            return payload.order.deviceId === variables.deviceId;
          } catch (error) {
            SlackWebHookManager.sendTextAndObjectToSlack(`[Error] Arrived order notification can not send to Barista APP. 
              OrderSetId:${payload.order.orderSetId}, DeviceId: ${payload.order.deviceId}`, {error});
            return false;
          }
        }
      ),
      resolve: async (payload, args, context) => {
        const { order, event } = payload;
        let typeOf = 'MposArrivedOrderPayload';
        if (event === mposOrderSubscriptionEvent.NEW_ORDER) {
          typeOf = 'MposNewOrderPayload';
        }
        return {
          event,
          order: { ...order, __typeOf: typeOf },
        };
      },
    },
    arrivedOrderEventByBrandLocation: {
      subscribe: withFilter(
        // eslint-disable-next-line no-unused-vars
        (_, __) => {
          pubsub.init();
          return pubsub.instance.asyncIterator([
            arrivedOrderSubscriptionEvent.ARRIVED_ORDER_FOR_VENDOR,
            arrivedOrderSubscriptionEvent.COMPLETED_ORDER_FOR_VENDOR,
          ]);
        },
        // payload is the payload of the event that was published.
        // variables is an object containing all arguments the client provided when initiating their subscription.
        (payload, variables) => {
          // Only push an update if the brandId matches the provided one
          return payload.order.brandLocationId === variables.brandLocationId;
        }
      ),
      resolve: async (payload, args, context) => {
        const { order, event } = payload;
        return {
          event,
          order,
        };
      },
    },
    operatingHourChangeEventByBrandAdmin: {
      subscribe: withFilter(
        // eslint-disable-next-line no-unused-vars
        (_, __) => {
          pubsub.init();
          return pubsub.instance.asyncIterator([
            operatingHourChangeEvent.WEEKLY_SCHEDULE_UPDATED,
            operatingHourChangeEvent.SCHEDULE_EXCEPTION_UPSERTED,
          ]);
        },
        // payload is the payload of the event that was published.
        // variables is an object containing all arguments the client provided when initiating their subscription.
        (payload, variables) => {
          // Only push an update if the brandId matches the provided one
          return payload.brandId === variables.brandId;
        }
      ),
      resolve: async (payload, args, context) => {
        const { weeklySchedule, exception, event } = payload;
        return {
          event,
          weeklySchedule,
          exception
        };
      },
    },
    operatingHourChangeEventByBrandLocationAdmin: {
      subscribe: withFilter(
        // eslint-disable-next-line no-unused-vars
        (_, __) => {
          pubsub.init();
          return pubsub.instance.asyncIterator([
            operatingHourChangeEvent.WEEKLY_SCHEDULE_UPDATED,
            operatingHourChangeEvent.SCHEDULE_EXCEPTION_UPSERTED,
          ]);
        },
        // payload is the payload of the event that was published.
        // variables is an object containing all arguments the client provided when initiating their subscription.
        (payload, variables) => {
          // Only push an update if the brandId matches the provided one
          return payload.brandLocationId === variables.brandLocationId;
        }
      ),
      resolve: async (payload, args, context) => {
        const { weeklySchedule, exception, event } = payload;
        return {
          event,
          weeklySchedule,
          exception
        };
      },
    },
  },
  MposOrderPayload: {
    __resolveType: obj => {
      return obj.__typeOf;
    },
  },
};
