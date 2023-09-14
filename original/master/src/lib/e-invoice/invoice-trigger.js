//const cfg = require('./../../../config');
const axios = require('axios');
const { first } = require('lodash');
const { eInvoiceLambda } = require('./../../../config');
const SlackWebHookManager = require('../../schema/slack-webhook-manager/slack-webhook-manager');
const { callDB, getSellerInfo, calculateTax, formatNumericValues } = require('../../helpers/invoice-trigger-helpers');

const LAMBDA_URL = eInvoiceLambda;

const getInvoiceData = async (context, id) => {
  const storeOrderSetId = id;

  const promiseList = [
    context.storeOrderSet.getById(storeOrderSetId),
    context.storeOrder.getAllByStoreOrderSet(storeOrderSetId),
    context.storeOrderSetFulfillment.getByStoreOrderSet(storeOrderSetId),
    context.storeOrderSetStatus.getAllByStoreOrderSet(storeOrderSetId),
  ];
  const [storeOrderSet, storeOrders, customerAddress, storeOrderStatus] = await callDB(promiseList);
  if (!storeOrderSet || !storeOrders.length || !storeOrderStatus.length)
    throw new Error('Invalid store order id.');

  const customer = await callDB(context.customer.getById(storeOrderSet.customerId));
  if (!customerAddress || !customer)
    throw new Error('Invalid customer id.');

  const storeOrderProducts = [];
  for (const storeOrder of storeOrders) {
    let _storeOrderProducts = await callDB(context.storeOrderProduct.getAllByStoreOrder(storeOrder.id));
    _storeOrderProducts = await Promise.all(_storeOrderProducts.map(async (SOP) => {
      const productDetails = await callDB(context.product.getById(SOP.productId, true));
      return {...productDetails, ...SOP};
    }));
    storeOrderProducts.push(..._storeOrderProducts);
  }
  if (!storeOrderProducts.length)
    throw new Error('No products found in the order.');

  const country = await callDB(context.country.getById(storeOrderSet.countryId));
  if (!country)
    throw new Error('Country not found');

  const AllowedIsoCodeInvoice = ['SA', 'AE', 'KW'];
  if (!AllowedIsoCodeInvoice.includes(country.isoCode))
    throw new Error('Invoice not available for this country.');

  const tax = formatNumericValues(calculateTax(storeOrderSet.total, country.vat));

  const seller = getSellerInfo(country);

  const buyer = {
    name: `${customer.firstName} ${customer.lastName}`,
    address: Object.values(customerAddress.deliveryAddress?.dynamicData).join(' ') || '',
    cityCountry: customerAddress.deliveryAddress?.city,
    vat: '',
    phone: customer.phoneNumber,
  };

  return {
    storeOrderSet,
    storeOrders,
    storeOrderProducts,
    seller,
    buyer,
    tax,
    taxRate: country.vat,
    countryIsoCode: country.isoCode,
  };
};

exports.triggerInvoiceGenerator = async (context, storeOrderSetId) => {
  const logs = [];
  try {
    logs.push({state: 'started'});
    const promiseList = [
      getInvoiceData(context, storeOrderSetId),
      context.storeOrderSetStatus.getLatestByStoreOrderSet(storeOrderSetId),
      context.paymentStatus.getAllByStoreOrderSetId(storeOrderSetId),
    ];
    const [invoiceData, statusForStoreOrderSet, paymentStatusHistory] = await Promise.all(promiseList);
    if (invoiceData && statusForStoreOrderSet && paymentStatusHistory) {
      const currentPaymentStatus = first(paymentStatusHistory);
      const currentStoreOrderSetStatus = statusForStoreOrderSet?.status;
      logs.push({state: 'promise-all-completed', invoiceData, currentPaymentStatus, currentStoreOrderSetStatus});
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
      `[STORE-ORDER-INVOICE] storeOrderSetId: ${storeOrderSetId} Invoice-trigger failed. (Error msg: ${error.message}) Please examine ELK logs. (eventType: storeInvoice-trigger-error)`
    );
    context.kinesisLogger.sendLogEvent({
      storeOrderSetId,
      error: error.message,
      stack: JSON.stringify(error.stack || {}),
      logs
    }, 'storeInvoice-trigger-error');
  } finally {
    context.kinesisLogger.sendLogEvent({storeOrderSetId, logs }, 'storeInvoice-trigger');
  }
};
