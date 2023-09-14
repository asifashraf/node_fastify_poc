const axios = require('axios');
const { subscriptionInvoiceLambda } = require('./../../../config');
const SlackWebHookManager = require('../../schema/slack-webhook-manager/slack-webhook-manager');
const { formatError } = require('../util');
const { callDB, getSellerInfo, calculateTax, formatNumericValues } = require('../../helpers/invoice-trigger-helpers');

const LAMBDA_URL = subscriptionInvoiceLambda;

const getInvoiceData = async (context, id) => {
  const subscriptionOrderId = id;
  const subscriptionOrder = await callDB(context.cSubscriptionOrder.getById(subscriptionOrderId));
  if (!subscriptionOrder) return formatError(['Subscription Order not found']);
  const promiseList = [
    context.customer.getById(subscriptionOrder.customerId),
    context.cSubscription.getById(subscriptionOrder.subscriptionId),
    context.country.getById(subscriptionOrder.countryId)
  ];
  const [customer, subscription, country] = await callDB(promiseList);
  if (!customer)
    throw new Error('Invalid customer id.');

  if (!subscription)
    throw new Error('Subscription not found');

  if (!country)
    throw new Error('Country not found');

  const AllowedIsoCodeInvoice = ['SA', 'AE', 'KW'];
  if (!AllowedIsoCodeInvoice.includes(country.isoCode))
    throw new Error('Invoice not available for this country.');

  const tax = formatNumericValues(calculateTax(subscriptionOrder.total, country.vat));

  const seller = getSellerInfo(country);

  const buyer = {
    name: `${customer.firstName} ${customer.lastName}`,
    vat: '',
    phone: customer.phoneNumber,
  };

  return {
    subscriptionOrder,
    subscription,
    seller,
    buyer,
    tax,
    taxRate: country.vat,
    countryIsoCode: country.isoCode,
  };
};

exports.triggerSubscriptionInvoiceGenerator = async (context, subscriptionOrderId) => {
  const logs = [];
  try {
    logs.push({state: 'started'});
    const invoiceData = await getInvoiceData(context, subscriptionOrderId);
    console.log(invoiceData);
    if (invoiceData) {
      logs.push({state: 'promise-all-completed', invoiceData});
      const payload = {
        invoiceData,
      };
      const config = {
        url: LAMBDA_URL,
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
        },
        data: JSON.stringify(payload),
      };
      const response = await axios(config);
      logs.push({state: 'response-came', response: response?.data});
    }
    logs.push({state: 'done'});
  } catch (error) {
    SlackWebHookManager.sendTextToSlack(
      `[SUBSCRIPTION-ORDER-INVOICE] subscriptionOrderId: ${subscriptionOrderId} Invoice-trigger failed. (Error msg: ${error.message}) Please examine ELK logs. (eventType: subscriptionInvoice-trigger-error)`
    );
    context.kinesisLogger.sendLogEvent({
      subscriptionOrderId,
      error: error.message,
      stack: JSON.stringify(error.stack || {}),
      logs
    }, 'subscriptionInvoice-trigger-error');
  } finally {
    context.kinesisLogger.sendLogEvent({subscriptionOrderId, logs }, 'subscriptionInvoice-trigger');
  }
};
