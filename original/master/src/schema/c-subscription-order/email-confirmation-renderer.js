const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { get, template, replace, find } = require('lodash');
const { jsonToObject } = require('../../lib/util');
const query = require('./email-confirmation-query');
const Money = require('../../lib/currency');

const paymentStatusNames = {
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
  PAYMENT_FAILURE: 'PAYMENT_FAILURE',
};

const paymentTypesTitlesList = {
  SERVICE_FEE: { en: 'Service Fee', ar: 'رسوم الخدمة' },
  VOUCHER: { en: 'Voucher', ar: 'رمز الخصم' },
  REWARD_DISCOUNT: { en: 'Reward Discount', ar: 'خصم' },
  AMOUNT_DUE: { en: 'Amount Due', ar: 'المبلغ المتبقي' },
  AMOUNT_PAID: { en: 'Amount Paid', ar: 'المبلغ المدفوع' },
  GIFT_CARD: { en: 'Gift Card', ar: 'كرت هدية' },
  CREDITS: { en: 'Credits', ar: 'ائتمانات' },
  DISCOVERY_CREDITS: { en: 'Discovery Points', ar: 'رصيد مجاني' },
};

const formatKuwaitiPhoneNumber = p => {
  // for some reason a `null` p is being sent through, even though
  // there appears to be a check below. This is temporary whack-a-mole
  // until we can find the source of the problem.
  //
  // TODO: unit test this renderer.
  if (!p) return '';

  return p.substring(0, 4) + ' ' + p.substring(4);
};
const toCurrencyValue = (amount, currency) =>
  new Money(
    amount,
    currency.decimalPlace,
    currency.lowestDenomination
  ).toCurrencyValue();
const formatCurrency = (value, decimals, code) => `${value} ${code}`;
const formatTitle = value => replace(value, '_', ' ');
const paymentTypesTitle = value => paymentTypesTitlesList[value];
const getTotalValue = (invoiceComponents, type, code) =>
  `${find(invoiceComponents, { type }).value} ${code}`;
const findInvoiceComponent = (invoiceComponents, type) => {
  const c = find(invoiceComponents, i => i.type === type);
  if (c) {
    return c.value;
  }
  return null;
};
const amountPaidByPaymentMethod = (invoiceComponents, currency) => {
  const credits = findInvoiceComponent(invoiceComponents, 'CREDITS') || 0;
  const giftCard = findInvoiceComponent(invoiceComponents, 'GIFT_CARD') || 0;
  let total = findInvoiceComponent(invoiceComponents, 'TOTAL') || 0;
  if (Number(total)) {
    if (Number(credits) > 0) {
      total = Number(total) - Number(credits);
    }
    if (Number(giftCard) > 0) {
      total = Number(total) - Number(giftCard);
    }
  }
  total = toCurrencyValue(total, currency);
  return total;
};
const renderSubject = ({subscriptionOrder}, successful, paymentPending) => {
  if (!successful) {
    /* eslint no-negated-condition: "error" */
    if (!paymentPending) {
      return `Payment Failure: ${subscriptionOrder.shortCode}`;
    }
    return `Payment Pending: ${subscriptionOrder.shortCode}`;
  }
  return `Order Confirmation: ${subscriptionOrder.shortCode}`;
};

const renderTemplate = (
  {subscriptionOrder, subscription},
  successful,
  knetResponse,
  pending,
  options = {}
) => {
  knetResponse = jsonToObject(knetResponse);

  const shortCode = subscriptionOrder.shortCode;
  const paymentMethod = subscriptionOrder.paymentMethod;
  const customer = subscriptionOrder.customer;
  const preferredLanguage = customer.preferredLanguage
    ? customer.preferredLanguage.toLowerCase()
    : 'en';
  const currency = subscriptionOrder.currency;
  const country = subscriptionOrder.country;
  const timeZoneIdentifier = country.timeZoneIdentifier;

  const countryPhoneNumber = get(
    subscriptionOrder,
    'country.servicePhoneNumber',
    '---'
  );

  const templateData = {
    countryPhoneNumber,
    shortCode,
    timeZoneIdentifier,
    country,
    currency,
    createdAtFormatted: moment(subscriptionOrder.created)
      .tz(timeZoneIdentifier)
      .format('LLLL'),
    customerName: `${customer.firstName} ${customer.lastName}`,
    paymentMethod,
    knetResponse,
    phoneNumber: customer.phoneNumber,
    subtotal: subscriptionOrder.subTotal,
    total: subscriptionOrder.total,
    year: moment().year(),
  };

  const templateDir = path.resolve(
    'templates',
    'dist',
    'subscription',
    preferredLanguage
  );

  // Confirmation email template setup
  const confirmationPath = path.join(templateDir, 'order.html');
  const confirmationFile = fs.readFileSync(confirmationPath, 'utf8');
  const confirmationTemplate = template(confirmationFile, {
    imports: {
      formatKuwaitiPhoneNumber,
      formatCurrency,
      formatTitle,
      paymentTypesTitle,
      getTotalValue,
      amountPaidByPaymentMethod,
    },
  });
  return confirmationTemplate(templateData);
};

const renderTextForOrder = (order, index, timeZoneIdentifier) => {
  const fulfillmentName = 'Purchase';
  const time = moment(order.created)
    .tz(timeZoneIdentifier)
    .format('LLLL');
  return `${fulfillmentName} ${index + 1}: ${time}`;
};

const renderTextForItem = (item, currency, preferredLanguage) => {
  const subscriptionName = item.name[preferredLanguage];
  const priceString = amount =>
    formatCurrency(
      amount,
      currency.decimalPlace,
      currency.code[preferredLanguage]
    );
  const text = `${subscriptionName}\nProduct Price: ${priceString(
    item.price
  )}\nQuantity: ${item.quantity || 1}`;

  return text;
};

const renderText = (
  {subscriptionOrder, subscription},
  successful,
  knetResponse,
  pending,
  options = {}
) => {
  const customer = subscriptionOrder.customer;
  const currency = subscriptionOrder.currency;
  const country = subscriptionOrder.country;
  const timeZoneIdentifier = country.timeZoneIdentifier;

  const preferredLanguage = customer.preferredLanguage
    ? customer.preferredLanguage.toLowerCase()
    : 'en';
  const shortCode = subscriptionOrder.shortCode;

  const createdAt = moment(subscriptionOrder.created)
    .tz(timeZoneIdentifier)
    .format('HH:mm');

  const numberOfOrders = 1;

  const pluralizedOrders = numberOfOrders > 1 ? 'orders' : 'order';

  const customerName = customer.firstName + ' ' + customer.lastName;
  const customerPhone = customer.phoneNumber
    ? formatKuwaitiPhoneNumber(customer.phoneNumber)
    : '';

  const orderTexts = [subscriptionOrder]
    .map((o, i) => renderTextForOrder(o, i, timeZoneIdentifier))
    .join('\n\n- - - - -\n\n');

  const itemTexts = [subscription]
    .map(item =>
      renderTextForItem(item, subscriptionOrder.currency, preferredLanguage)
    )
    .join('\n\n- - - - -\n\n');

  const subtotal = formatCurrency(
    subscriptionOrder.subTotal,
    currency.decimalPlace,
    currency.code[preferredLanguage]
  );

  const total = formatCurrency(
    subscriptionOrder.total,
    currency.decimalPlace,
    currency.code[preferredLanguage]
  );

  let knetContent;

  let knetSummary = `KNET Payment Summary:
Result: ${get(knetResponse, 'result', 'n/a')}`;

  if (get(subscriptionOrder, 'total', 0) > 0) {
    knetSummary += `
Amount: ${total}`;
  }

  if (successful) {
    knetContent = `Payment succeeded for your order ${shortCode}.

${knetSummary}`;
  } else if (pending) {
    knetContent = `Payment pending for your order ${shortCode}.

${knetSummary}`;
  } else {
    knetContent = `Payment failed for your order ${shortCode}.

${knetSummary}`;
  }

  let orderDetails = '';
  if (!options.subscriptionOrderStatusChange) {
    orderDetails = `
    SUBTOTAL: ${subtotal}
    TOTAL: ${total}
     `;

    if (country.hasVat) {
      orderDetails += `
      **********
      VAT(%): ${country.vat}
      VAT ID: ${country.vatId}
      **********
      `;
    }
  }

  const composedText = `
${knetContent}

**********

ORDER CODE: ${shortCode}
ORDERED AT: ${createdAt}

${numberOfOrders} ${pluralizedOrders}

${customerName}
${customerPhone}
**********

${orderTexts}

**********

${itemTexts}

**********

${orderDetails}
  `;

  return composedText;
};

const renderConfirmationEmail = async (
  context,
  subscriptionOrderId,
  paymentStatusName,
  knetResponse
) => {
  const successful = paymentStatusName === paymentStatusNames.PAYMENT_SUCCESS;
  const pending = paymentStatusName === paymentStatusNames.PAYMENT_PENDING;

  // Flag the graphql method so we do not check permissions on queries we do internally
  const results = await context.graphql(query, { id: subscriptionOrderId }, true);

  const subscriptionOrderDetails = results.data.subscriptionOrderForCallbacks;
  return Promise.resolve({
    customerId: subscriptionOrderDetails.subscriptionOrder.customer.id,
    subject: renderSubject(subscriptionOrderDetails, successful, pending),
    text: renderText(subscriptionOrderDetails, successful, knetResponse, pending),
    html: renderTemplate(subscriptionOrderDetails, successful, knetResponse, pending),
  });
};

module.exports = {
  renderConfirmationEmail,
};
