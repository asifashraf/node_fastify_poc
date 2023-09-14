// const { get } = require('lodash');
// const queryBuilder = require('./notifications-query');
const { notificationCategories } = require('../../lib/notifications');
const {
  contentTemplates,
  replacePlaceholders,
} = require('../../lib/push-notification');
const { addLocalizationField } = require('../../lib/util');
// const { oneSignalConfig } = require('../../../config');

const categoryMapping = {
  PICKUP: notificationCategories.PICKUP_UPDATE,
  CAR: notificationCategories.PICKUP_UPDATE,
  // HOSPITAL: notificationCategories.PICKUP_UPDATE,
  // CLASS: notificationCategories.PICKUP_UPDATE,
  // OFFICE: notificationCategories.PICKUP_UPDATE,
  // AIRPORT: notificationCategories.PICKUP_UPDATE,
  DELIVERY: notificationCategories.DELIVERY_UPDATE,
  EXPRESS_DELIVERY: notificationCategories.EXPRESS_DELIVERY_UPDATE,
};

const { orderSetStatusNames } = require('./../../schema/root/enums');

const emptySet = { push: [], email: [] };

const fetchNotificationDataForOrder = async (orderSetId, context) => {
  // const { query, params } = queryBuilder(orderSetId);

  const { customerId, customerFirstName, brandId, shortCode, fulfillmentType } = await context.roDb('view_orders')
    .select('customer_id', 'customer_first_name', 'brand_id', 'short_code', 'fulfillment_type')
    .where('id', orderSetId).first();
  const brand = addLocalizationField(await context.roDb('brands')
    .where('id', brandId)
    .first(), 'name');
  const brandName = brand.name;

  const category = categoryMapping[fulfillmentType];

  //const results = await context.graphql(query, params);
  //console.log(results)
  //if (!results.data || !results.data.orderSet) {
  //  return null;
  //}
  //
  //const orderSet = results.data.orderSet;
  //const fulfillmentType = get(orderSet, 'fulfillment.type');
  //const customerId = get(orderSet, 'customer.id');
  //const customerFirstName = get(orderSet, 'customer.firstName');
  //const brandName = get(orderSet, 'brandLocation.brand.name');
  //const shortCode = get(orderSet, 'shortCode');
  //const category = categoryMapping[fulfillmentType];

  if (!fulfillmentType || !customerId || !brandName || !shortCode) {
    return null;
  }

  return {
    customerId,
    customerFirstName,
    brandName,
    category,
    shortCode,
  };
};


const acceptedNotifications = async (orderSetId, context) => {
  /* eslint-disable no-template-curly-in-string */
  const data = await fetchNotificationDataForOrder(orderSetId, context);

  const { customerId, category, brandName, customerFirstName } = data;
  let message = contentTemplates().contents.orderAccepted;
  let heading = contentTemplates().headings.orderAccepted;
  const url = contentTemplates().urls.orderAccepted;

  message = replacePlaceholders(message, {
    // eslint-disable-next-line camelcase
    brand_name_en: brandName.en,
    // eslint-disable-next-line camelcase
    brand_name_ar: brandName.ar,
    // eslint-disable-next-line camelcase
    brand_name_tr: brandName.tr,
  });

  heading = replacePlaceholders(heading, {
    // eslint-disable-next-line camelcase
    brand_name_en: brandName.en,
    // eslint-disable-next-line camelcase
    brand_name_ar: brandName.ar,
    // eslint-disable-next-line camelcase
    brand_name_tr: brandName.tr,
    // eslint-disable-next-line camelcase
    first_name: customerFirstName,
  });

  return {
    push: [
      {
        customerId,
        message,
        heading,
        url,
        notificationCategory: category,
        orderSetId,
      },
    ],
    email: [],
  };
};

const rejectedNotifications = async (orderSetId, context) => {
  /* eslint-disable no-template-curly-in-string */
  const data = await fetchNotificationDataForOrder(orderSetId, context);
  const { customerId, category, brandName, customerFirstName } = data;
  let message = contentTemplates().contents.orderRejected;
  let heading = contentTemplates().headings.orderRejected;
  const url = contentTemplates().urls.orderRejected;

  message = replacePlaceholders(message, {
    // eslint-disable-next-line camelcase
    brand_name_en: brandName.en,
    // eslint-disable-next-line camelcase
    brand_name_ar: brandName.ar,
    // eslint-disable-next-line camelcase
    brand_name_tr: brandName.tr,
  });

  heading = replacePlaceholders(heading, {
    // eslint-disable-next-line camelcase
    brand_name_en: brandName.en,
    // eslint-disable-next-line camelcase
    brand_name_ar: brandName.ar,
    // eslint-disable-next-line camelcase
    brand_name_tr: brandName.tr,
    // eslint-disable-next-line camelcase
    first_name: customerFirstName,
  });

  return {
    push: [
      {
        customerId,
        message,
        heading,
        url,
        notificationCategory: category,
        orderSetId,
      },
    ],
    email: [],
  };
};

const readyForPickupNotifications = async (orderSetId, context) => {
  /* eslint-disable no-template-curly-in-string */
  const data = await fetchNotificationDataForOrder(orderSetId, context);
  const { customerId, category, brandName, customerFirstName } = data;

  let message = contentTemplates().contents.orderReadyForPickup;
  let heading = contentTemplates().headings.orderReadyForPickup;
  const url = contentTemplates().urls.orderReadyForPickup;

  message = replacePlaceholders(message, {
    // eslint-disable-next-line camelcase
    brand_name_en: brandName.en,
    // eslint-disable-next-line camelcase
    brand_name_ar: brandName.ar,
    // eslint-disable-next-line camelcase
    brand_name_tr: brandName.tr,
  });

  heading = replacePlaceholders(heading, {
    // eslint-disable-next-line camelcase
    brand_name_en: brandName.en,
    // eslint-disable-next-line camelcase
    brand_name_ar: brandName.ar,
    // eslint-disable-next-line camelcase
    brand_name_tr: brandName.tr,
    // eslint-disable-next-line camelcase
    first_name: customerFirstName,
  });

  return {
    push: [
      {
        customerId,
        message,
        heading,
        url,
        notificationCategory: category,
        orderSetId,
      },
    ],
    email: [],
  };
};

const outForDeliveryNotifications = async (orderSetId, context) => {
  /* eslint-disable no-template-curly-in-string */
  const data = await fetchNotificationDataForOrder(orderSetId, context);
  const { customerId, category, brandName, customerFirstName } = data;

  let message = contentTemplates().contents.orderOutOfDelivery;
  let heading = contentTemplates().headings.orderOutOfDelivery;
  const url = contentTemplates().urls.orderOutOfDelivery;

  message = replacePlaceholders(message, {
    // eslint-disable-next-line camelcase
    brand_name_en: brandName.en,
    // eslint-disable-next-line camelcase
    brand_name_ar: brandName.ar,
    // eslint-disable-next-line camelcase
    brand_name_tr: brandName.tr,
  });

  heading = replacePlaceholders(heading, {
    // eslint-disable-next-line camelcase
    brand_name_en: brandName.en,
    // eslint-disable-next-line camelcase
    brand_name_ar: brandName.ar,
    // eslint-disable-next-line camelcase
    brand_name_tr: brandName.tr,
    // eslint-disable-next-line camelcase
    first_name: customerFirstName,
  });

  return {
    push: [
      {
        customerId,
        message,
        heading,
        url,
        notificationCategory: category,
        orderSetId,
      },
    ],
    email: [],
  };
};

const notificationsForStatusChange = (orderSetId, status, context) => {
  switch (status) {
    case orderSetStatusNames.ACCEPTED:
      return acceptedNotifications(orderSetId, context);
    case orderSetStatusNames.REJECTED:
      return rejectedNotifications(orderSetId, context);
    case orderSetStatusNames.READY_FOR_PICKUP:
      return readyForPickupNotifications(orderSetId, context);
    case orderSetStatusNames.OUT_FOR_DELIVERY:
      return outForDeliveryNotifications(orderSetId, context);
    default:
      return emptySet;
  }
};

module.exports = {
  notificationsForStatusChange,
};
