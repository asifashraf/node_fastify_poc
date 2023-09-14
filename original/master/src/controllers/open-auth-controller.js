const InternalAuthService = require('../schema/auth/internal-service');
const { setupAuthContext } = require('../helpers/context-helpers');
const SlackWebHookManager = require('../schema/slack-webhook-manager/slack-webhook-manager');
const { ecommercePortalUrl, smsAlertSlackUrl } = require('../../config');
const { smsOperationType } = require('../schema/auth/enums');

const verifyCustomerToken = async (req, res) => {
  try {

    const { body } = req;

    const { cofeCustomerToken } = body;

    const context = await setupAuthContext(req);

    const authorization = InternalAuthService.authenticate(
      cofeCustomerToken
    );

    const authCustomer = await context.authCustomer.getById(authorization.userId);

    if (authCustomer.isDisabled) {
      res.status(401).send({ error: 'Unauthorized' });
    }

    const customer = await context.customer.getById(authorization.userId);

    res.status(200).send({ customer });

  } catch (err) {
    // TODO: will add logger
    res.status(401).send({ error: 'Unauthorized' });
  }
};

const getCustomerDetails = async (req, res) => {
  try {

    const result = { address: null, device_tokens: null };

    const { body } = req;

    const { customer_id, type } = body;

    if (!customer_id && !type) {
      return res.status(401).send({ error: 'Customer Id and type is required' });
    }

    const context = await setupAuthContext(req);

    const customer = await context.customer.getById(customer_id);

    if (!customer) {
      return res.status(401).send({ error: 'Invalid Customer ID' });
    }

    if (type == 'address') {
      result.address = await context.customerAddress.getByCustomer(customer_id);
    }

    res.status(200).send({ ...result });

  } catch (err) {
    // TODO: will add logger
    res.status(401).send({ error: 'Unauthorized' });
  }
};

const sendMpNotifications = async (req, res) => {
  try {

    const { body } = req;

    const { customer_id, type, notification, data } = body;

    if (!customer_id && !type) {
      return res.status(401).send({ error: 'Customer Id and type is required' });
    }

    if (!notification && !data) {
      return res.status(401).send({ error: 'Notification and data is required' });
    }

    const { message, heading } = notification;

    const context = await setupAuthContext(req);

    const customer = await context.customer.getById(customer_id);

    if (!customer) {
      return res.status(401).send({ error: 'Invalid Customer ID' });
    }

    await context.notification.pushCreate({
      message,
      data,
      notificationCategory: type,
      heading,
      customerId: customer_id,
      url: data.deeplink,
      storeOrderId: data.orderId,
      disable: false,
    });

    res.status(200).send({ success: 'Success' });

  } catch (err) {
    // TODO: will add logger
    res.status(401).send({ error: 'Unauthorized' });
  }
};

const sendMpSlackNotifications = async (req, res) => {
  try {

    const { body } = req;

    const { data, webhook, text } = body;

    if (!data && !webhook && !text) {
      return res.status(401).send({ error: 'slack data and webhook is required' });
    }

    SlackWebHookManager.sendDataBlocksAndButton(
      text,
      data,
      webhook,
      `${ecommercePortalUrl}orders/${data.OrderId}`
    );

    res.status(200).send({ success: 'Success' });

  } catch (err) {
    // TODO: will add logger
    res.status(401).send({ error: 'Unauthorized' });
  }
};

const sendMpSmsNotifications = async (req, res) => {
  try {

    const { body } = req;

    const { receiverInfo, content, referenceId } = body;

    if (!content)
      return res.status(401).send({ error: 'Sms Content is required' });

    if (!referenceId)
      return res.status(401).send({ error: 'Reference Id is required' });

    const context = await setupAuthContext(req);

    if (receiverInfo && receiverInfo.length > 0) {

      const _receivers = receiverInfo.map(async (receiver) => {

        const availableCountry = await context.driver.getSMSProvider(receiver.country);

        if (availableCountry) {

          const smsService = context.driver.setSMSService(receiver.phone_number, availableCountry);

          try {

            const isValid = await smsService.validate();

            if (isValid) {

              await smsService.sendSMS({ referenceId, body: content, operationType: smsOperationType.ECOM });
              SlackWebHookManager.sendTextAndObjectAndImage({
                text: '[!!!SMS_SERVICE_SUCCESS!!!]',
                object: { referenceId, body, operationType: smsOperationType.ECOM },
                webhookUrl: smsAlertSlackUrl,
              });
            }

          } catch (error) {
            const { stack, message } = error || {};
            await context.driver.logIt({ eventType: 'ecom-sms-error', eventObject: { stack, message } });
          }
        }

        return receiver;
      });

      await Promise.all(_receivers);
    }

    res.status(200).send({ success: 'Success' });

  } catch (err) {
    // TODO: will add logger
    res.status(401).send({ error: 'Unauthorized' });
  }
};

module.exports = {
  verifyCustomerToken,
  getCustomerDetails,
  sendMpNotifications,
  sendMpSlackNotifications,
  sendMpSmsNotifications
};
