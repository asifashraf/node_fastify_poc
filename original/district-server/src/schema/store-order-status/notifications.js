const { get, map } = require('lodash');
const queryBuilder = require('./notifications-query');

const { notificationCategories } = require('../../lib/notifications');
const {
  contentTemplates,
  replacePlaceholders,
} = require('../../lib/push-notification');

const {
  notifications: {
    emailAddresses: { receipts },
  },
} = require('../../../config');

const { storeOrderStatusName } = require('./../../schema/root/enums');
const {
  renderStoreOrderStatusEmail,
} = require('../store-order-set/email-confirmation-renderer');

const emptySet = { push: [], email: [] };

const fetchNotificationDataForStoreOrder = async (storeOrderId, context) => {
  const { query, params } = queryBuilder(storeOrderId);
  const results = await context.graphql(query, params);

  if (!results.data || !results.data.storeOrder) {
    return null;
  }
  const storeOrder = results.data.storeOrder;
  const customerId = get(storeOrder, 'storeOrderSet.customer.id');
  const customerfirstName = get(storeOrder, 'customer.firstName');
  const brandName = get(storeOrder, 'brand.name');
  const shortCode = get(storeOrder, 'shortCode');
  const products = get(storeOrder, 'products');
  const storeOrderSet = get(storeOrder, 'storeOrderSet');

  if (!customerId || !brandName || !shortCode || !storeOrderSet) {
    return null;
  }

  return {
    customerId,
    customerfirstName,
    brandName,
    shortCode,
    products,
    storeOrderSet,
  };
};

const dispatchedNotifications = async (storeOrderId, context) => {
  /* eslint-disable no-template-curly-in-string */
  const data = await fetchNotificationDataForStoreOrder(storeOrderId, context);

  const { customerId, storeOrderSet, brandName, shortCode } = data;
  let message = contentTemplates().contents.storeOrderDispatched;
  const heading = contentTemplates().headings.storeOrderDispatched;
  const url = contentTemplates().urls.storeOrderDispatched;

  message = replacePlaceholders(message, {
    orderId: shortCode,
    brandName: brandName.en,
    brandNameAr: brandName.ar,
    brandNameTr: brandName.tr,
  });

  const rendering = await renderStoreOrderStatusEmail(
    context,
    storeOrderSet.id,
    storeOrderSet.payment.currentStatus.name,
    storeOrderId
  );

  const emailArgs = Object.assign(
    {
      sender: receipts,
      notificationCategory: notificationCategories.STORE_ORDER_UPDATE,
    },
    rendering
  );

  return {
    push: [
      {
        customerId,
        message,
        heading,
        url,
        notificationCategory: notificationCategories.STORE_ORDER_UPDATE,
        storeOrderId,
      },
    ],
    email: [emailArgs],
  };
};

const deliveredNotifications = async (storeOrderId, context) => {
  const data = await fetchNotificationDataForStoreOrder(storeOrderId, context);
  const { customerId, storeOrderSet, shortCode, brandName } = data;
  let message = contentTemplates().contents.storeOrderDelivered;
  const heading = contentTemplates().headings.storeOrderDelivered;
  const url = contentTemplates().urls.storeOrderDelivered;

  message = replacePlaceholders(message, {
    orderId: shortCode,
    brandName: brandName.en,
    brandNameAr: brandName.ar,
    brandNameTr: brandName.tr,
  });

  const rendering = await renderStoreOrderStatusEmail(
    context,
    storeOrderSet.id,
    storeOrderSet.payment.currentStatus.name,
    storeOrderId
  );

  const emailArgs = Object.assign(
    {
      sender: receipts,
      notificationCategory: notificationCategories.STORE_ORDER_UPDATE,
    },
    rendering
  );

  return {
    push: [
      {
        customerId,
        message,
        heading,
        url,
        notificationCategory: notificationCategories.STORE_ORDER_UPDATE,
        storeOrderId,
      },
    ],
    email: [emailArgs],
  };
};

const rejectedNotifications = async (storeOrderId, context) => {
  const data = await fetchNotificationDataForStoreOrder(storeOrderId, context);
  const { customerId, products } = data;
  let message = contentTemplates().contents.storeOrderRejected;
  let heading = contentTemplates().headings.storeOrderRejected;
  const url = contentTemplates().urls.storeOrderRejected;

  const productNames = map(products, product => product.name.en).join(', ');
  const productNamesAr = map(products, product => product.name.ar).join(', ');
  const productNamesTr = map(products, product => product.name.tr).join(', ');

  message = replacePlaceholders(message, {
    productNames,
    productNamesAr,
    productNamesTr,
  });

  heading = replacePlaceholders(heading, {
    productNames,
    productNamesAr,
    productNamesTr,
  });

  return {
    push: [
      {
        customerId,
        message,
        heading,
        url,
        notificationCategory: notificationCategories.STORE_ORDER_UPDATE,
        storeOrderId,
      },
    ],
    email: [],
  };
};

const notificationsForStatusChange = (storeOrderId, status, context) => {
  switch (status) {
    case storeOrderStatusName.DISPATCHED:
      return dispatchedNotifications(storeOrderId, context);
    case storeOrderStatusName.DELIVERED:
      return deliveredNotifications(storeOrderId, context);
    case storeOrderStatusName.REJECTED:
      return rejectedNotifications(storeOrderId, context);
    default:
      return emptySet;
  }
};

module.exports = {
  notificationsForStatusChange,
};
