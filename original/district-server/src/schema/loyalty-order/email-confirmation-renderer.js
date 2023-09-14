const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { get, template, toNumber } = require('lodash');
const query = require('./email-confirmation-query');
const { timezone } = require('../../../config');

const formatKuwaitiPhoneNumber = p => p.substring(0, 4) + ' ' + p.substring(4);
const formatCurrency = (value, decimals, code) =>
  `${Number.parseFloat(value).toFixed(decimals)}${code}`;

const renderTemplate = (loyaltyOrder, knetResponse) => {
  const customer = loyaltyOrder.customer;
  const preferredLanguage = customer.preferredLanguage
    ? customer.preferredLanguage.toLowerCase()
    : 'en';

  const countryPhoneNumber = get(
    loyaltyOrder,
    'currency.country.servicePhoneNumber',
    ''
  );

  const templateData = {
    countryPhoneNumber,
    createdAtFormatted: moment(loyaltyOrder.createdAt).format('D MMMM YYYY'),
    customerName: `${customer.firstName} ${customer.lastName}`,
    totalCredit: toNumber(loyaltyOrder.amount) + toNumber(loyaltyOrder.bonus),
    knetResponse,
    loyaltyOrder,
    shortCode: `Credits - ${loyaltyOrder.sku}`,
    year: moment()
      .tz(timezone)
      .year(),
  };

  const templateDir = path.resolve('templates', 'dist', preferredLanguage);
  const confirmationPath = path.join(templateDir, 'credits.html');
  const confirmationFile = fs.readFileSync(confirmationPath, 'utf8');

  const confirmationTemplate = template(confirmationFile, {
    imports: {
      formatKuwaitiPhoneNumber,
      formatCurrency,
    },
  });

  return confirmationTemplate(templateData);
};

const renderText = (loyaltyOrder, knetResponse) => {
  const createdAt = moment(loyaltyOrder.createdAt)
    .tz(timezone)
    .format('HH:mm');

  const totalCredit =
    toNumber(loyaltyOrder.amount) + toNumber(loyaltyOrder.bonus);

  const customer = loyaltyOrder.customer;
  const customerName = customer.firstName + ' ' + customer.lastName;
  const customerPhone = customer.phoneNumber
    ? formatKuwaitiPhoneNumber(customer.phoneNumber)
    : '';
  const preferredLanguage = customer.preferredLanguage
    ? customer.preferredLanguage.toLowerCase()
    : 'en';

  let orderTexts = `${formatCurrency(
    loyaltyOrder.amount,
    loyaltyOrder.currency.decimalPlace,
    loyaltyOrder.currency.symbol[preferredLanguage]
  )} \tCofe Credit \t${formatCurrency(
    loyaltyOrder.amount,
    loyaltyOrder.currency.decimalPlace,
    loyaltyOrder.currency.symbol[preferredLanguage]
  )} \n`;
  if (loyaltyOrder.bonus > 0) {
    orderTexts += `${formatCurrency(
      loyaltyOrder.bonus,
      loyaltyOrder.currency.decimalPlace,
      loyaltyOrder.currency.symbol[preferredLanguage]
    )} \tBonus \t\t${formatCurrency(
      0,
      loyaltyOrder.currency.decimalPlace,
      loyaltyOrder.currency.symbol[preferredLanguage]
    )} `;
  }

  const total = formatCurrency(
    loyaltyOrder.amount,
    loyaltyOrder.currency.decimalPlace,
    loyaltyOrder.currency.symbol[preferredLanguage]
  );

  let knetSummary = `KNET Payment Summary:
Result: ${get(knetResponse, 'result', 'n/a')}`;

  if (get(loyaltyOrder, 'amount', 0) > 0) {
    knetSummary += `
Amount: ${total}
Reference ID: ${knetResponse.ref}
Payment ID: ${knetResponse.paymentid}
Merchant Track ID: ${knetResponse.trackid}`;
  }

  const knetContent = `Payment succeeded for your ${formatCurrency(
    loyaltyOrder.amount,
    loyaltyOrder.currency.decimalPlace,
    loyaltyOrder.currency.symbol[preferredLanguage]
  )} Cofe Credit Order.

${knetSummary}`;

  const composedText = `
${knetContent}

**********

ORDERED AT: ${createdAt}

${customerName}
${customerPhone}

**********

${orderTexts}

**********

TOTAL: ${total}

TOTAL CREDIT ADDED TO ACCOUNT: ${formatCurrency(
    totalCredit,
    loyaltyOrder.currency.decimalPlace,
    loyaltyOrder.currency.symbol[preferredLanguage]
  )}
`;

  return composedText;
};

const renderConfirmationEmail = async (
  context,
  loyaltyOrderId,
  paymentStatusName,
  knetResponse
) => {
  // Flag the graphql method so we do not check permissions on queries we do internally
  const results = await context.graphql(query, { id: loyaltyOrderId }, true);
  const loyaltyOrder = results.data.loyaltyOrder;

  return Promise.resolve({
    customerId: loyaltyOrder.customer.id,
    subject: 'Order Confirmation for Cofe Credit',
    text: renderText(loyaltyOrder, knetResponse),
    html: renderTemplate(loyaltyOrder, knetResponse),
  });
};

module.exports = {
  renderConfirmationEmail,
};
