const express = require('express');
const isUUID = require('is-uuid');
const SlackWebHookManager = require('../schema/slack-webhook-manager/slack-webhook-manager');
const { env } = require('../../config');
const mposWebhookUrl = require('../../config').mpos.slackWebHook;
const { isNullOrUndefined } = require('../lib/util');
const { pick } = require('lodash');

// eslint-disable-next-line new-cap
const router = express.Router();

const errorResponse = (error, req, res) => {
  const { queryContextWithoutAuth: context } = req.app;
  const { stack, message } = error || {};
  context.generalCCCService.logIt({
    eventType: 'mpos-error',
    eventObject: { stack, message, baseUrl: req?.originalUrl, deviceId: req?.body?.deviceId },
  }).catch(e => console.log('mpos-error-exception', e));
  return res.json({ success: false, message: 'Unexpected Error' });
};
router.route('/code').post(async (req, res) => {
  try {
    const { body } = req;
    let { deviceId = '' } = body;
    deviceId = deviceId ? deviceId.trim() : '';

    if (deviceId === '') {
      SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/code] Missing parameter (deviceId)`, mposWebhookUrl);
      return res.json({ success: false, message: 'Invalid request, Missing parameter (deviceId)' });
    }
    const { queryContextWithoutAuth: context } = req.app;
    const response = await context.brandLocationDevice.generateCodeByDeviceId({
      deviceId,
    });

    return res.json(response);
  } catch (e) {
    return errorResponse(e, req, res);
  }
});

router.route('/status').post(async (req, res) => {
  try {
    const { body } = req;
    let { deviceId = '' } = body;
    const { serialNumber, appVersion } = body;
    deviceId = deviceId ? deviceId.trim() : '';

    if (deviceId === '') {
      SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/status] Missing parameter (deviceId)`, mposWebhookUrl);
      return res.json({ success: false, message: 'Invalid Device, Missing parameter (deviceId)' });
    }
    const { queryContextWithoutAuth: context } = req.app;
    const response = await context.brandLocationDevice.getStatus(deviceId, serialNumber, appVersion);
    return res.json(response);
  } catch (e) {
    return errorResponse(e, req, res);
  }
});

router.route('/currencies').post(async (req, res) => {
  try {
    const { queryContextWithoutAuth: context } = req.app;
    const currencies = await context.currency.getAll({});
    return res.json({ success: true, currencies });
  } catch (e) {
    return errorResponse(e, req, res);
  }
});

router.route('/countries').post(async (req, res) => {
  try {
    const { queryContextWithoutAuth: context } = req.app;
    const { body } = req;
    let branchCountryId = null;
    if (body) {
      let { deviceId = '' } = body;
      deviceId = deviceId ? deviceId.trim() : '';
      if (deviceId) {
        const { contact } = await context.brandLocationDevice.getServiceDetail(deviceId);
        if (contact) branchCountryId = contact.id;
      }
    }
    let countries = await context.country.getAll({});
    countries = countries.map(country => {
      const countryObj = pick(country, ['dialCode', 'isoCode', 'flagPhoto', 'servicePhoneNumber', 'name', 'timeZoneIdentifier', 'timeZoneOffset']);
      countryObj.defaultCountry = country.id == branchCountryId;
      return countryObj;
    });
    return res.json({ success: true, countries });
  } catch (e) {
    return errorResponse(e, req, res);
  }
});

router.route('/new-orders').post(async (req, res) => {
  try {
    const { body, headers } = req;
    let { deviceId = '' } = body;
    const { limit = null, page = null } = body;
    const { serialnumber, appversion } = headers;
    deviceId = deviceId ? deviceId.trim() : '';

    if (deviceId === '') {
      SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/new-orders] Missing parameter (deviceId)`, mposWebhookUrl);
      return res.json({ success: false, message: 'Invalid request, Missing parameter (deviceId)' });
    }

    if (!isNullOrUndefined(limit) && !isNullOrUndefined(page) && (!Number.isInteger(limit) || !Number.isInteger(page) || page < 1 || limit < 1)) {
      SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/new-orders] Invalid pagination parameter (limit:${limit}, page:${page})`, mposWebhookUrl);
      return res.json({ success: false, message: `Invalid request, Invalid pagination parameter (limit:${limit}, page:${page})` });
    }

    const { queryContextWithoutAuth: context } = req.app;
    const response = await context.brandLocationDevice.getNewOrders(deviceId, limit, page, serialnumber, appversion);
    return res.json(response);
  } catch (e) {
    return errorResponse(e, req, res);
  }
});

router.route('/past-orders').post(async (req, res) => {
  try {
    const { body } = req;
    let { deviceId = '', shortCode = '' } = body;
    const { limit = null, page = null } = body;
    deviceId = deviceId ? deviceId.trim() : '';
    shortCode = shortCode ? shortCode.trim() : '';

    if (deviceId === '') {
      SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/past-orders] Missing parameter (deviceId)`, mposWebhookUrl);
      return res.json({ success: false, message: 'Invalid request, Missing parameter (deviceId)' });
    }
    if (!isNullOrUndefined(limit) && !isNullOrUndefined(page) && (!Number.isInteger(limit) || !Number.isInteger(page) || page < 1 || limit < 1)) {
      SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/past-orders] Invalid pagination parameter (limit:${limit}, page:${page})`, mposWebhookUrl);
      return res.json({ success: false, message: `Invalid request, Invalid pagination parameter (limit:${limit}, page:${page})` });
    }

    if (shortCode && shortCode.length > 6) {
      SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/past-orders] Invalid short-code (${shortCode})`, mposWebhookUrl);
      return res.json({ success: false, message: 'Invalid short code' });
    }

    const { queryContextWithoutAuth: context } = req.app;
    const response = await context.brandLocationDevice.getPastOrders(
      deviceId,
      limit,
      page,
      shortCode,
    );

    return res.json(response);
  } catch (e) {
    return errorResponse(e, req, res);
  }
});

router.route('/order-detail').post(async (req, res) => {
  try {
    const { body } = req;
    let { deviceId = '', orderSetId = '' } = body;
    deviceId = deviceId ? deviceId.trim() : '';
    orderSetId = orderSetId ? orderSetId.trim() : '';
    if (deviceId === '' || !isUUID.v4(orderSetId)) {
      SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/order-detail] Invalid request for the device (${deviceId}) and the order (${orderSetId})`, mposWebhookUrl);
      return res.json({ success: false, message: `Invalid request for the device (${deviceId}) and the order (${orderSetId})` });
    }

    const { queryContextWithoutAuth: context } = req.app;
    const response = await context.brandLocationDevice.getOrderDetail(
      deviceId,
      orderSetId,
    );
    return res.json(response);
  } catch (e) {
    return errorResponse(e, req, res);
  }
});

router.route('/order-status').post(async (req, res) => {
  try {
    const { body } = req;
    let { deviceId = '', orderSetId = '', status = '' } = body;
    const { rejectedReason, reportedReason } = body;
    deviceId = deviceId ? deviceId.trim() : '';
    orderSetId = orderSetId ? orderSetId.trim() : '';
    status = status ? status.trim() : '';
    if (deviceId === '' || orderSetId === '' || status === '') {
      SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/order-status] Missing parameters deviceId (${deviceId}) orderId: (${orderSetId}), status (${status})`, mposWebhookUrl);
      return res.json({ success: false, message: `Invalid request, Missing parameters deviceId (${deviceId}) orderId: (${orderSetId}), status (${status})` });
    }

    if (!isUUID.v4(orderSetId)) {
      SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/order-status] Unknown order (${orderSetId}) for the device (${deviceId})`, mposWebhookUrl);
      return res.json({ success: false, message: `Invalid order ID, Unknown order (${orderSetId}) for the device (${deviceId})` });
    }

    if (
      !(status === 'ACCEPTED' || status === 'PREPARING' || status === 'REJECTED' || status === 'REPORTED')
    ) {
      SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/order-status] Invalid order status (${status}) for the device (${deviceId}) and order (${orderSetId})`, mposWebhookUrl);
      return res.json({ success: false, message: `Invalid order status (${status}) for the device (${deviceId}) and order (${orderSetId})` });
    }

    const { queryContextWithoutAuth: context } = req.app;
    if (status === 'ACCEPTED') {
      const response = await context.brandLocationDevice.acceptOrder(
        deviceId,
        orderSetId,
      );
      return res.json(response);
    } else if (status === 'PREPARING') {
      const response = await context.brandLocationDevice.preparingOrder(
        deviceId,
        orderSetId,
      );
      return res.json(response);
    } else if (status === 'REJECTED') {
      if (rejectedReason < 0 || rejectedReason > 3) {
        return res.json({ success: false, message: 'Invalid rejected reason' });
      }
      const rejectReasonList = [
        'UNEXPECTED_STORE_CLOSURE',
        'OUT_OF_STOCK',
        'DISTANCE_IS_TOO_FAR',
        'OTHER',
      ];
      context.req.clientPlatform = 'barista-mpos';
      const response = await context.brandLocationDevice.rejectedOrder(
        deviceId,
        orderSetId,
        rejectReasonList[rejectedReason],
      );
      return res.json(response);
    } else if (status === 'REPORTED') {
      if (reportedReason < 0 || reportedReason > 2) {
        return res.json({ success: false, message: 'Invalid reported reason' });
      }
      const reportedReasonList = [
        'CUSTOMER_NOT_SHOWED_UP',
        'TECHNICAL_ISSUE',
        'OTHER',
      ];
      context.req.clientPlatform = 'barista-mpos';
      const response = await context.brandLocationDevice.reportedOrder(
        deviceId,
        orderSetId,
        reportedReasonList[reportedReason],
      );
      return res.json(response);
    }
  } catch (e) {
    return errorResponse(e, req, res);
  }
});

router.route('/branch-status').post(async (req, res) => {
  try {
    const { body } = req;
    let { deviceId = '' } = body;
    deviceId = deviceId.trim();
    if (deviceId === '') {
      SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/branch-status] Missing parameter (deviceId)`, mposWebhookUrl);
      return res.json({ success: false, message: 'Invalid request, Missing parameter (deviceId)' });
    }

    const { queryContextWithoutAuth: context } = req.app;
    const response = await context.brandLocationDevice.getBranchDetail(deviceId);
    return res.json(response);
  } catch (e) {
    return errorResponse(e, req, res);
  }
});

router.route('/branch-items').post(async (req, res) => {
  try {
    const { body } = req;
    let { deviceId = '' } = body;
    deviceId = deviceId.trim();
    if (deviceId === '') {
      SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/branch-items] Missing parameter (deviceId)`, mposWebhookUrl);
      return res.json({ success: false, message: 'Invalid request, Missing parameter (deviceId)' });
    }

    const { queryContextWithoutAuth: context } = req.app;
    const response = await context.brandLocationDevice.getBranchMenuItems(deviceId);
    return res.json({ ...response, success: true, menu: response });
  } catch (e) {
    return errorResponse(e, req, res);
  }
});

router.route('/branch-item-status').post(async (req, res) => {
  try {
    const { body } = req;
    let { deviceId = '', status = '' } = body;
    const { menuItemIds = [] } = body;
    deviceId = deviceId ? deviceId.trim() : '';
    status = status ? status.trim() : '';
    if (deviceId === '' || status === '') {
      SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/branch-item-status] Missing parameters deviceId (${deviceId}), status (${status})`, mposWebhookUrl);
      return res.json({ success: false, message: `Invalid request, Missing parameters deviceId (${deviceId}), status (${status})` });
    }

    if (!Array.isArray(menuItemIds)) {
      SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/branch-item-status] Unknown menu items (${menuItemIds}) for the device (${deviceId})`, mposWebhookUrl);
      return res.json({ success: false, message: `Unknown menu items (${menuItemIds}) for the device (${deviceId})` });
    } else if (menuItemIds.length === 0) {
      SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/branch-item-status] menuItemIds is required parameter for the device (${deviceId})`, mposWebhookUrl);
      return res.json({ success: false, message: 'menuItemIds is required parameter' });
    }

    if (
      !(status === 'AVAILABLE' || status === 'SOLD_OUT' || status === 'NOT_COMMERCIALIZED')
    ) {
      SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/branch-item-status] Invalid menu item status (${status}) for the device (${deviceId})`, mposWebhookUrl);
      return res.json({ success: false, message: `Invalid menu item status (${status}) for the device (${deviceId})` });
    }

    const { queryContextWithoutAuth: context } = req.app;
    const response = await context.brandLocationDevice.updateBrancMenuItemStatus(
      deviceId,
      menuItemIds,
      status,
    );
    return res.json(response);
  } catch (e) {
    return errorResponse(e, req, res);
  }
});

router.route('/branch-availability').post(async (req, res) => {
  try {
    const { body } = req;
    let { deviceId = '' } = body;
    deviceId = deviceId.trim();
    if (deviceId === '') {
      SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/branch-availability] Missing parameter (deviceId)`, mposWebhookUrl);
      return res.json({ success: false, message: 'Invalid request, Missing parameter (deviceId)' });
    }

    const { queryContextWithoutAuth: context } = req.app;
    // const response = await context.brandLocationDevice.getBranchAvailability(deviceId);
    const response = await context.brandLocationDevice.getBranchAvailabilityNew(deviceId);
    return res.json(response);
  } catch (e) {
    return errorResponse(e, req, res);
  }
});


router.route('/update-branch-availability').post(async (req, res) => {
  try {
    const { body } = req;
    let { deviceId = '', selectedFulfillments } = body;
    const { offlineTime, updatedStatus, reason, acceptingOrder } = body;
    deviceId = deviceId ? deviceId.trim() : '';
    const { queryContextWithoutAuth: context } = req.app;
    if (deviceId === '' || (isNullOrUndefined(acceptingOrder) && isNullOrUndefined(updatedStatus))) {
      SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/branch-availability] Missing parameters deviceId (${deviceId}), acceptingOrder (${acceptingOrder}, updatedStatus (${updatedStatus})`, mposWebhookUrl);
      return res.json({ success: false, message: `Missing parameters deviceId (${deviceId}), acceptingOrder (${acceptingOrder}, updatedStatus (${updatedStatus})` });
    }

    const offlineTimeList = [
      'MIN_15',
      'MIN_30',
      'MIN_60',
      'INDEFINITELY'
    ];

    const reasonList = [
      'CAN_NOT_ACCEPT_MORE_ORDERS',
      'UNEXPECTED_STORE_CLOSURE',
      'MAINTENANCE_ISSUE',
      'OTHER',
    ];
    let response = null;
    if (updatedStatus) {
      if (updatedStatus == 'BUSY') {
        if (!Number.isInteger(offlineTime) || offlineTime < 0 || offlineTime > 3) {
          SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/update-branch-availability] Invalid offline time (${offlineTime}) for the device (${deviceId})`, mposWebhookUrl);
          return res.json({ success: false, message: 'Invalid branch availability offline data' });
        }
        if (!Number.isInteger(reason) || reason < 0 || reason > 3) {
          SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/update-branch-availability] Invalid reason (${reason}) for the device (${deviceId})`, mposWebhookUrl);
          return res.json({ success: false, message: 'Invalid branch availability reason data' });
        }
        if (Array.isArray(selectedFulfillments)) {
          const fulfillments = ['ALL', 'PICKUP', 'CAR', 'DELIVERY', 'EXPRESS_DELIVERY'];
          if (selectedFulfillments.length == 0 || !selectedFulfillments.every(v => fulfillments.includes(v))) {
            SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/update-branch-availability] Invalid fulfillment type (${selectedFulfillments}) for the device (${deviceId})`, mposWebhookUrl);
            return res.json({ success: false, message: 'Invalid branch availability selected fulfillments' });
          }
        } else selectedFulfillments = 'ALL';
        response = await context.brandLocationDevice.updateBusyBranchAvailability(deviceId, offlineTimeList[offlineTime], selectedFulfillments, reasonList[reason]);
      } else if (updatedStatus == 'NOT_ACCEPTING_ORDER') {
        if (!Number.isInteger(reason) || reason < 0 || reason > 3) {
          SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/update-branch-availability] Invalid reason (${reason}) for the device (${deviceId})`, mposWebhookUrl);
          return res.json({ success: false, message: 'Invalid branch availability reason data' });
        }
        response = await context.brandLocationDevice.updateAcceptingOrderBranchAvailability(
          deviceId,
          false,
          reasonList[reason]
        );
      } else {
        response = await context.brandLocationDevice.updateAcceptingOrderBranchAvailability(
          deviceId,
          true,
          null
        );
      }
      /*
      if (updatedStatus === 'BUSY' && (!Number.isInteger(offlineTime) || offlineTime < 0 || offlineTime > 3) &&
        (!Number.isInteger(reason) || reason < 0 || reason > 3)) {
        SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/branch-availability] Invalid offline time (${offlineTime}) or reason (${reason}) for the device (${deviceId})`, mposWebhookUrl);
        return res.json({ success: false, message: 'Invalid branch availability offline or reason data' });
      } else if (updatedStatus === 'NOT_ACCEPTING_ORDER' && (!Number.isInteger(reason) || reason < 0 || reason > 3)) {
        SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/branch-availability] Invalid reason (${reason}) for the device (${deviceId})`, mposWebhookUrl);
        return res.json({ success: false, message: 'Invalid branch availability reason data' });
      }
      acceptingOrder = updatedStatus === 'ACCEPTING_ORDER';
      isNewAppRequest = true;
      hasReason = !acceptingOrder;
      */
    } else {
      if (acceptingOrder) {
        response = await context.brandLocationDevice.updateAcceptingOrderBranchAvailability(
          deviceId,
          true,
          null
        );
      } else {
        if (isNaN(offlineTime)) {
          response = await context.brandLocationDevice.updateAcceptingOrderBranchAvailability(
            deviceId,
            false,
            reasonList[3]
          );
        } else {
          response = await context.brandLocationDevice.updateBusyBranchAvailability(deviceId, offlineTimeList[offlineTime], 'ALL', reasonList[3]);
        }
      }
      /**
       *  DEPRECETED
      if (!acceptingOrder && (!Number.isInteger(offlineTime) || offlineTime < 0 || offlineTime > 3)) {
        SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/branch-availability] Invalid offline time (${offlineTime}) for the device (${deviceId})`, mposWebhookUrl);
        return res.json({ success: false, message: 'Invalid branch availability offline data' });
      }
      */
    }
    if (response.success) {
      const availability = await context.brandLocationDevice.getBranchAvailabilityNew(deviceId);
      if (availability.success) {
        response.storeStatus = availability.storeStatus;
        response.busyStatusByFulfillmentType = availability.busyStatusByFulfillmentType;
      }
    }
    /*
    const { queryContextWithoutAuth: context } = req.app;
    const response = await context.brandLocationDevice.updateBranchAvailabilityStatus(
      deviceId,
      acceptingOrder,
      acceptingOrder ? null : (isNaN(offlineTime) ? null : offlineTimeList[offlineTime]),
      isNewAppRequest,
      hasReason ? reasonList[reason] : null,
      req.body,
    );
    */
    return res.json(response);
  } catch (e) {
    console.log('e', e);
    return errorResponse(e, req, res);
  }
});

router.route('/service-detail').post(async (req, res) => {
  try {
    const { body } = req;
    let { deviceId = '' } = body;
    deviceId = deviceId.trim();
    if (deviceId === '') {
      SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/service-detail] Missing parameter (deviceId)`, mposWebhookUrl);
      return res.json({ success: false, message: 'Invalid request, Missing parameter (deviceId)' });
    }

    const { queryContextWithoutAuth: context } = req.app;
    const response = await context.brandLocationDevice.getServiceDetail(deviceId);
    return res.json(response);
  } catch (e) {
    return errorResponse(e, req, res);
  }
});

router.route('/completed-order').post(async (req, res) => {
  try {
    const { body } = req;
    const { orderSetIds } = body;
    if (!orderSetIds || !Array.isArray(orderSetIds)) {
      SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/completed-order] Invalid parameter (orderSetIds)`, mposWebhookUrl);
      return res.json({ success: false, message: 'Invalid request, Invalid parameter (orderSetIds)' });
    }
    const { queryContextWithoutAuth: context } = req.app;
    const response = await context.brandLocationDevice.completeOrders(orderSetIds);
    return res.json(response);
  } catch (e) {
    return errorResponse(e, req, res);
  }
});

router.route('/status-update-notification').post(async (req, res) => {
  try {
    const { body } = req;
    const { orderSetIds } = body;
    if (!orderSetIds || !Array.isArray(orderSetIds)) {
      SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/status-update-notification] Invalid parameter (orderSetIds)`, mposWebhookUrl);
      return res.json({ success: false, message: 'Invalid request, Invalid parameter (orderSetIds)' });
    }
    const { queryContextWithoutAuth: context } = req.app;
    const response = await context.brandLocationDevice.sendNotificationOrders(orderSetIds);
    return res.json(response);
  } catch (e) {
    return errorResponse(e, req, res);
  }
});

router.route('/arrived-orders').post(async (req, res) => {
  try {
    const { body } = req;
    let { deviceId = '' } = body;
    deviceId = deviceId.trim();
    if (deviceId === '') {
      SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/branch-availability] Missing parameter (deviceId)`, mposWebhookUrl);
      return res.json({ success: false, message: 'Invalid request, Missing parameter (deviceId)' });
    }

    const { queryContextWithoutAuth: context } = req.app;
    const response = await context.brandLocationDevice.getArrivedOrders(deviceId);
    return res.json(response);
  } catch (e) {
    return errorResponse(e, req, res);
  }
});

/*
router.route('/accept-order').post(async (req, res) => {
  const { body } = req;
  let { deviceId = '', orderId = '' } = body;
  deviceId = deviceId.trim();
  orderId = orderId.trim();
  if (deviceId === '' || orderId === '') {
    return res.json({ success: false, message: 'Invalid request' });
  }

  if (!isUUID.v4(orderId)) {
    return res.json({ success: false, message: 'Invalid order ID' });
  }

  const { queryContextWithoutAuth: context } = req.app;
  const response = await context.brandLocationDevice.acceptOrder(
    deviceId,
    orderId
  );
  return res.json(response);
});

router.route('/reject-order').post(async (req, res) => {
  const { body } = req;
  let { deviceId = '', orderId = '' } = body;
  const { rejectedReason = 2 } = body;
  deviceId = deviceId.trim();
  orderId = orderId.trim();

  if (deviceId === '' || !Number.isInteger(rejectedReason)) {
    return res.json({ success: false, message: 'Invalid request' });
  }

  if (!isUUID.v4(orderId)) {
    return res.json({ success: false, message: 'Invalid order ID' });
  }

  if (rejectedReason < 0 || rejectedReason > 2) {
    return res.json({ success: false, message: 'Invalid rejected reason' });
  }
  const rejectReasonList = [
    'OUT_OF_STOCK',
    'UNEXPECTED_STORE_CLOSURE',
    'OTHER',
  ];
  const { queryContextWithoutAuth: context } = req.app;
  const response = await context.brandLocationDevice.rejectedOrder(
    deviceId,
    orderId,
    rejectReasonList[rejectedReason]
  );
  return res.json(response);
});
*/

router.route('/logout').post(async (req, res) => {
  try {
    const { body } = req;
    let { deviceId = '' } = body;
    deviceId = deviceId.trim();

    if (deviceId === '') {
      SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/logout] Missing parameter (deviceId)`, mposWebhookUrl);
      return res.json({ success: false, message: 'Invalid Device, Missing parameter (deviceId)' });
    }
    //console.log(deviceId);
    const { queryContextWithoutAuth: context } = req.app;
    const response = await context.brandLocationDevice.unpairDevice(deviceId);
    return res.json({ success: response });
  } catch (e) {
    return errorResponse(e, req, res);
  }
});

router.route('/auth-token').post(async (req, res) => {
  try {
    const { body } = req;
    let { deviceId = '' } = body;
    deviceId = deviceId.trim();

    if (deviceId === '') {
      return res.json({ success: false, message: 'Invalid Device, Missing parameter (deviceId)' });
    }
    const { queryContextWithoutAuth: context } = req.app;
    const response = await context.brandLocationDevice.getAuthenticationWithDeviceId(
      deviceId,
    );
    return res.json({ success: true, response });
  } catch (e) {
    return errorResponse(e, req, res);
  }
});

router.route('/maintenance-status').post(async (req, res) => {
  try {
    const { body } = req;
    let { deviceId = '' } = body;
    deviceId = deviceId.trim();

    if (deviceId === '') {
      return res.json({ success: false, message: 'Invalid Device, Missing parameter (deviceId)' });
    }
    const { queryContextWithoutAuth: context } = req.app;
    const response = await context.brandLocationDevice.getMaintenanceStatus(
      deviceId,
    );
    return res.json(response);
  } catch (e) {
    return errorResponse(e, req, res);
  }
});

/**
 * For MPos, some features are disabled
 *
 router.route('/create-maintenance-user').post(async (req, res) => {
  const { body } = req;
  let { deviceId = '' } = body;
  const { area = '', block = '', street = '', avenue = '', buildingNumber = '', phoneNumber = '' } = body;
  deviceId = deviceId.trim();

  if (deviceId === '') {
    return res.json({ success: false, message: 'Invalid Device' });
  }
  if (area === '') {
    return res.json({ success: false, message: 'Invalid Area' });
  }
  if (block === '') {
    return res.json({ success: false, message: 'Invalid Block' });
  }
  if (street === '') {
    return res.json({ success: false, message: 'Invalid Street' });
  }
  if (phoneNumber === '' || isNaN(parseInt(phoneNumber))) {
    return res.json({ success: false, message: 'Invalid Phone Number' });
  }

  const { queryContextWithoutAuth: context } = req.app;
  const userInput = {
    area,
    block,
    street,
    avenue,
    buildingNumber,
    phoneNumber
  };
  const response = await context.brandLocationDevice.saveMaintenanceUser(deviceId, userInput);
  return res.json(response);
});
 */

router.route('/get-assessment-list').post(async (req, res) => {
  try {
    const { body } = req;
    let { deviceId = '' } = body;
    deviceId = deviceId.trim();

    if (deviceId === '') {
      return res.json({ success: false, message: 'Invalid Device, Missing parameter (deviceId)' });
    }
    const { queryContextWithoutAuth: context } = req.app;
    const response = await context.brandLocationDevice.getAssessmentList(
      deviceId,
    );
    return res.json(response);
  } catch (e) {
    return errorResponse(e, req, res);
  }
});


/* router.route('/create-assessment').post(async (req, res) => {
  const { body } = req;
  let { deviceId = ''} = body;
  const { subServiceId = '', areaId = '', block = '', street = '', avenue = '', buildingNumber = '', phoneNumber = ''} = body;
  deviceId = deviceId.trim();

  if (deviceId === '') {
    return res.json({ success: false, message: 'Invalid Device' });
  }
  if (subServiceId === '' || isNaN(parseInt(subServiceId))) {
    return res.json({ success: false, message: 'Invalid SubServiceId' });
  }
  if (areaId === '' || isNaN(parseInt(areaId))) {
    return res.json({ success: false, message: 'Invalid AreaId' });
  }
  if (block === '') {
    return res.json({ success: false, message: 'Invalid Block' });
  }
  if (street === '') {
    return res.json({ success: false, message: 'Invalid Street' });
  }
  if (phoneNumber === '' || isNaN(parseInt(phoneNumber))) {
    return res.json({ success: false, message: 'Invalid Phone Number' });
  }

  const { queryContextWithoutAuth: context } = req.app;
  const assessmentInput = {
    subServiceId,
    areaId,
    block,
    street,
    avenue,
    buildingNumber,
    phoneNumber
  };
  const response = await context.brandLocationDevice.saveMaintenanceAssessment(deviceId, assessmentInput);
  return res.json(response);
}); */

router.route('/get-ticket-list').post(async (req, res) => {
  try {
    const { body } = req;
    let { deviceId = '' } = body;
    deviceId = deviceId.trim();

    if (deviceId === '') {
      return res.json({ success: false, message: 'Invalid Device, Missing parameter (deviceId)' });
    }
    const { queryContextWithoutAuth: context } = req.app;
    const response = await context.brandLocationDevice.getTicketList(
      deviceId,
    );
    return res.json(response);
  } catch (e) {
    return errorResponse(e, req, res);
  }
});

router.route('/create-ticket').post(async (req, res) => {
  try {
    const { body } = req;
    let { deviceId = '' } = body;
    const { assessmentId = '', subject = '', description = '', flatOffice = '', phoneNumber = '' } = body;
    deviceId = deviceId.trim();

    if (deviceId === '') {
      return res.json({ success: false, message: 'Invalid Device, Missing parameter (deviceId)' });
    }
    if (assessmentId === '' || !isUUID.v4(assessmentId)) {
      return res.json({ success: false, message: 'Invalid AssessmentId' });
    }
    if (subject === '') {
      return res.json({ success: false, message: 'Invalid Subject' });
    }
    if (description === '') {
      return res.json({ success: false, message: 'Invalid Description' });
    }
    if (phoneNumber === '' || isNaN(parseInt(phoneNumber))) {
      return res.json({ success: false, message: 'Invalid Phone Number' });
    }

    const { queryContextWithoutAuth: context } = req.app;
    const ticketInput = {
      assessmentId,
      subject,
      description,
      flatOffice,
      phoneNumber,
    };
    const response = await context.brandLocationDevice.saveMaintenanceTicket(deviceId, ticketInput);
    return res.json(response);
  } catch (e) {
    return errorResponse(e, req, res);
  }
});

/* router.route('/get-area-list').post(async (req, res) => {
  const { body } = req;
  let { deviceId = '' } = body;
  deviceId = deviceId.trim();

  if (deviceId === '') {
    return res.json({ success: false, message: 'Invalid Device' });
  }
  const { queryContextWithoutAuth: context } = req.app;
  const response = await context.brandLocationDevice.getAreaList(
    deviceId
  );
  return res.json(response);
});


router.route('/get-sub-service-list').post(async (req, res) => {
  const { body } = req;
  let { deviceId = '' } = body;
  deviceId = deviceId.trim();

  if (deviceId === '') {
    return res.json({ success: false, message: 'Invalid Device' });
  }
  const { queryContextWithoutAuth: context } = req.app;
  const response = await context.brandLocationDevice.getSubServiceList(
    deviceId
  );
  return res.json(response);
}); */

/**
 * These endpoints for new Barista APP
 */

router.route('/V2/branch-availability').post(async (req, res) => {
  try {
    const { body } = req;
    let { deviceId = '' } = body;
    deviceId = deviceId.trim();
    if (deviceId === '') {
      return res.json({ success: false, message: 'Invalid request' });
    }
    const { queryContextWithoutAuth: context } = req.app;
    const response = await context.brandLocationDevice.getBranchAvailabilityNew(deviceId);
    return res.json(response);
  } catch (e) {
    return errorResponse(e, req, res);
  }
});

router.route('/V2/update-branch-availability').post(async (req, res) => {
  try {
    const { body } = req;
    let { deviceId = '' } = body;
    const { updatedStatus } = body;
    deviceId = deviceId ? deviceId.trim() : '';
    const { queryContextWithoutAuth: context } = req.app;
    const statusList = ['ACCEPTING_ORDER', 'NOT_ACCEPTING_ORDER', 'BUSY'];
    if (deviceId === '' || updatedStatus === null || updatedStatus === undefined || !statusList.includes(updatedStatus)) {
      SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/v2/update-branch-availability] Missing parameters deviceId (${deviceId}), updatedStatus (${updatedStatus})`, mposWebhookUrl);
      return res.json({ success: false, message: 'Invalid request' });
    }
    const {offlineTime, selectedFulfillments, reason } = body;
    const offlineTimeList = [
      'MIN_15',
      'MIN_30',
      'MIN_60',
      'INDEFINITELY'
    ];
    const reasonList = [
      'CAN_NOT_ACCEPT_MORE_ORDERS',
      'UNEXPECTED_STORE_CLOSURE',
      'MAINTENANCE_ISSUE',
      'ORDER'
    ];
    let response = null;
    if (updatedStatus == 'BUSY') {
      const fulfillments = ['ALL', 'PICKUP', 'CAR', 'DELIVERY', 'EXPRESS_DELIVERY'];
      if (!Number.isInteger(offlineTime) || offlineTime < 0 || offlineTime > 3) {
        SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/v2/update-branch-availability] Invalid offline time (${offlineTime}) for the device (${deviceId})`, mposWebhookUrl);
        return res.json({ success: false, message: 'Invalid branch availability offline data' });
      }
      if (!Array.isArray(selectedFulfillments) || selectedFulfillments.length == 0 || !selectedFulfillments.every(v => fulfillments.includes(v))) {
        SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/v2/update-branch-availability] Invalid fulfillment type (${selectedFulfillments}) for the device (${deviceId})`, mposWebhookUrl);
        return res.json({ success: false, message: 'Invalid branch availability selected fulfillments' });
      }
      if (!Number.isInteger(reason) || reason < 0 || reason > 3) {
        SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/v2/update-branch-availability] Invalid reason (${reason}) for the device (${deviceId})`, mposWebhookUrl);
        return res.json({ success: false, message: 'Invalid branch availability reason data' });
      }
      response = await context.brandLocationDevice.updateBusyBranchAvailability(deviceId, offlineTimeList[offlineTime], selectedFulfillments, reasonList[reason]);
      //return res.send(response);
    } else if (updatedStatus == 'NOT_ACCEPTING_ORDER') {
      if (!Number.isInteger(reason) || reason < 0 || reason > 3) {
        SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/v2/update-branch-availability] Invalid reason (${reason}) for the device (${deviceId})`, mposWebhookUrl);
        return res.json({ success: false, message: 'Invalid branch availability reason data' });
      }
      response = await context.brandLocationDevice.updateAcceptingOrderBranchAvailability(
        deviceId,
        false,
        reasonList[reason]
      );
      // return res.send(response);
    } else {
      response = await context.brandLocationDevice.updateAcceptingOrderBranchAvailability(
        deviceId,
        true,
        null
      );
      //return res.send(response);
    }
    if (response.success) {
      const availability = await context.brandLocationDevice.getBranchAvailabilityNew(deviceId);
      if (availability.success) {
        response.storeStatus = availability.storeStatus;
        response.busyStatusByFulfillmentType = availability.busyStatusByFulfillmentType;
      }
    }
    return res.json(response);
  } catch (e) {
    return errorResponse(e, req, res);
  }
});

router.route('/V2/update-weekly-schedule').post(async (req, res) => {
  try {
    const { body } = req;
    let { deviceId = '' } = body;
    const { schedules} = body;
    deviceId = deviceId ? deviceId.trim() : '';
    const { queryContextWithoutAuth: context } = req.app;
    if (deviceId === '' || !Array.isArray(schedules)) {
      SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/v2/update-weekly-schedule'] Missing parameters deviceId (${deviceId}), schedules (${schedules})`, mposWebhookUrl);
      return res.json({ success: false, message: 'Invalid request' });
    }

    const response = await context.brandLocationDevice.updateWeeklySchedule(
      deviceId,
      schedules
    );
    return res.json(response);
  } catch (e) {
    return errorResponse(e, req, res);
  }
});

router.route('/V2/add-schedule-exception').post(async (req, res) => {
  try {
    const { body } = req;
    let { deviceId = '' } = body;
    const { exception} = body;
    deviceId = deviceId ? deviceId.trim() : '';
    const { queryContextWithoutAuth: context } = req.app;
    if (deviceId === '' || !exception) {
      SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/v2/add-schedule-exception'] Missing parameters deviceId (${deviceId}), exception (${exception})`, mposWebhookUrl);
      return res.json({ success: false, message: 'Invalid request' });
    }

    const response = await context.brandLocationDevice.addScheduleException(
      deviceId,
      exception
    );
    return res.json(response);
  } catch (e) {
    return errorResponse(e, req, res);
  }
});

router.route('/V2/delete-schedule-exception').post(async (req, res) => {
  try {
    const { body } = req;
    let { deviceId = '' } = body;
    const { exceptionId} = body;
    deviceId = deviceId ? deviceId.trim() : '';
    const { queryContextWithoutAuth: context } = req.app;
    if (deviceId === '' || !isUUID.v4(exceptionId)) {
      SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/v2/add-schedule-exception'] Missing parameters deviceId (${deviceId}), exceptionId (${exceptionId})`, mposWebhookUrl);
      return res.json({ success: false, message: 'Invalid request' });
    }

    const response = await context.brandLocationDevice.deleteScheduleException(
      deviceId,
      exceptionId
    );
    return res.json(response);
  } catch (e) {
    return errorResponse(e, req, res);
  }
});

router.route('/V2/get-schedule-exceptions').post(async (req, res) => {
  try {
    const { body } = req;
    let { deviceId = '' } = body;
    deviceId = deviceId ? deviceId.trim() : '';
    const { queryContextWithoutAuth: context } = req.app;
    if (deviceId === '') {
      SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/v2/get-schedule-exceptions'] Missing parameters deviceId (${deviceId})`, mposWebhookUrl);
      return res.json({ success: false, message: 'Invalid request' });
    }

    const response = await context.brandLocationDevice.getScheduleExceptions(deviceId);
    return res.json(response);
  } catch (e) {
    return errorResponse(e, req, res);
  }
});

router.route('/V2/branch-status').post(async (req, res) => {
  try {
    const { body } = req;
    let { deviceId = '' } = body;
    deviceId = deviceId.trim();
    if (deviceId === '') {
      SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/branch-status] Missing parameter (deviceId)`, mposWebhookUrl);
      return res.json({ success: false, message: 'Invalid request' });
    }

    const { queryContextWithoutAuth: context } = req.app;
    const response = await context.brandLocationDevice.getBranchDetailNew(deviceId);
    return res.json(response);
  } catch (e) {
    return errorResponse(e, req, res);
  }
});

router.route('/branch-end-of-day-report').post(async (req, res) => {
  try {
    const { body } = req;
    let { deviceId = '' } = body;
    deviceId = deviceId.trim();
    if (deviceId === '') {
      SlackWebHookManager.sendTextToSlack(`[ERROR] [${env}] [/branch-end-of-day-report] Missing parameter (deviceId)`, mposWebhookUrl);
      return res.json({ success: false, message: 'Invalid request' });
    }
    const { queryContextWithoutAuth: context } = req.app;
    const response = await context.brandLocationDevice.getBrandLocationEndOfDayReport(deviceId);
    return res.json(response);
  } catch (e) {
    return errorResponse(e, req, res);
  }
});

router.route('*').all((req, res) => {
  try {
    return res.status(404).json({
      success: false,
      message: 'Invalid Request',
    });
  } catch (e) {
    return errorResponse(e, req, res);
  }
});

module.exports = router;
