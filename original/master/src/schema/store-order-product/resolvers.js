const { addLocalizationField } = require('../../lib/util');
const { minBy } = require('lodash');

module.exports = {
  StoreOrderProduct: {
    storeOrder({ storeOrderId }, args, context) {
      return context.storeOrder.getById(storeOrderId);
    },
    totalPrice({ price, quantity }) {
      return Number(price) * quantity;
    },

    product({ productId }, args, context) {
      return context.product.getById(productId, true);
    },
    async pickupLocation({ productId, storeOrderId }, args, context) {
      const storeOrder = await context.storeOrder.getById(storeOrderId);
      if (storeOrder) {
        const storeOrderSetFulfillment = await context.storeOrderSetFulfillment.getByStoreOrderSet(
          storeOrder.storeOrderSetId
        );
        if (storeOrderSetFulfillment) {
          if (storeOrderSetFulfillment.deliveryAddress) {
            const pickupLocations = await context.product.getPickupLocationsWithDeliveryAddressDistance(
              [productId],
              storeOrderSetFulfillment.deliveryAddress.id,
              storeOrder.storeOrderSetId
            );

            const nearestPickupLocation = minBy(pickupLocations, o =>
              Number(o.distance)
            );

            return nearestPickupLocation;
          }
        }
      }
      return null;
    },
    async currency({ id }, args, context) {
      return addLocalizationField(
        addLocalizationField(
          await context.storeOrderProduct.getCurrency(id),
          'symbol'
        ),
        'subunitName'
      );
    },
  },
};
