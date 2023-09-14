/* eslint-disable max-params */
const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { get, template, toNumber, split } = require('lodash');
const query = require('./email-confirmation-query');
const { timezone } = require('../../../config');
const SlackWebHookManager = require('../slack-webhook-manager/slack-webhook-manager');

const formatKuwaitiPhoneNumber = p => p.substring(0, 4) + ' ' + p.substring(4);
const formatCurrency = (value, decimals, code) =>
  `${Number.parseFloat(value).toFixed(decimals)}${code}`;

const imageResize = (
  logoUrl,
  height = null,
  width = null,
  dpr = 1,
  radius = 0,
  formatRequired = null
) => {
  logoUrl = split(logoUrl, 'upload');
  const splittedLogoFormat = split(logoUrl[1], '.');

  logoUrl = `${logoUrl[0]}upload/r_${radius},c_fill,dpr_${dpr}${
    height ? `,h_${height}` : ''
  }${width ? `,w_${width}` : ''}${splittedLogoFormat[0]}${
    formatRequired ? `.${formatRequired}` : `.${splittedLogoFormat[1]}`
  }`;
  return logoUrl;
};

const renderTemplate = (
  giftCardOrder,
  knetResponse,
  templateId,
  receiverAsCustomer
) => {
  const customer = giftCardOrder.customer;
  SlackWebHookManager.sendTextAndObjectToSlack('Customer that bought gift card:', JSON.stringify(customer));
  if (receiverAsCustomer) {
    SlackWebHookManager.sendTextAndObjectToSlack('Receiver as costumer:', JSON.stringify(receiverAsCustomer));
  }
  let preferredLanguage = customer.preferredLanguage
    ? customer.preferredLanguage.toLowerCase()
    : 'en';

  if (templateId === 'receiver') {
    preferredLanguage =
      receiverAsCustomer && receiverAsCustomer.preferredLanguage
        ? receiverAsCustomer.preferredLanguage.toLowerCase()
        : 'en';
  }
  SlackWebHookManager.sendTextToSlack('Preferred lang: ' + preferredLanguage);

  const countryPhoneNumber = get(
    giftCardOrder,
    'currency.country.servicePhoneNumber',
    ''
  );
  const currencyCode = get(
    giftCardOrder,
    `currency.symbol[${preferredLanguage}]`,
    ''
  );
  const anonymousSender = giftCardOrder.anonymousSender
    ? giftCardOrder.anonymousSender
    : false;

  const shortCode = get(giftCardOrder, 'shortCode', '');
  const shareUrl = get(giftCardOrder, 'giftCard.shareUrl', '');
  const imageUrl = get(
    giftCardOrder,
    `giftCard.imageUrl[${preferredLanguage}]`,
    ''
  );
  const message = get(giftCardOrder, 'message', '');
  const paymentMethod = get(giftCardOrder, 'paymentMethod', { id: '' });
  let receiverEmail = get(giftCardOrder, 'receiverEmail', '');
  const redeemedByEmail = receiverEmail;

  if (templateId === 'receipt' || templateId === 'redeemed') {
    receiverEmail = customer.email;
  }
  const receiverName = get(giftCardOrder, 'receiverName', '');
  const redeemedByName = receiverName;
  const mobile = get(customer, 'phoneNumber', '');
  let customerName = `${customer.firstName} ${customer.lastName}`;
  const senderName = customerName;
  if (anonymousSender) {
    customerName = 'Anonymous user';
  }
  const vendor = get(
    giftCardOrder,
    `giftCardTemplate.brand.name[${preferredLanguage}]`,
    ''
  );
  try {
    knetResponse = JSON.parse(knetResponse);
  } catch (err) {}
  const trackId = get(knetResponse, 'InvoiceTransactions[0].TrackId', '');
  const referenceId = get(
    knetResponse,
    'InvoiceTransactions[0].ReferenceId',
    ''
  );

  const paymentId = get(knetResponse, 'InvoiceTransactions[0].PaymentId', '');
  const serviceType = 'Gift Card';
  const templateData = {
    createdAtFormatted: moment(giftCardOrder.createdAt).format('D MMMM YYYY'),
    giftCardAmount: toNumber(giftCardOrder.amount),
    countryPhoneNumber,
    customerName,
    senderName,
    knetResponse,
    giftCardOrder,
    shortCode,
    receiverEmail,
    receiverName,
    redeemedByEmail,
    redeemedByName,
    message,
    serviceType,
    vendor,
    paymentMethod,
    anonymousSender,
    currencyCode,
    mobile,
    shareUrl,
    referenceId,
    trackId,
    paymentId,
    imageUrl: imageResize(imageUrl, 140, 'auto', 2, 10, 'png'),
    year: moment()
      .tz(timezone)
      .year(),
    time: moment()
      .tz(timezone)
      .format('HH:mm'),
  };
  const templateDir = path.resolve(
    'templates',
    'dist',
    'gift-cards',
    preferredLanguage
  );
  const confirmationPath = path.join(templateDir, `${templateId}.html`);
  const confirmationFile = fs.readFileSync(confirmationPath, 'utf8');

  const confirmationTemplate = template(confirmationFile, {
    imports: {
      formatKuwaitiPhoneNumber,
      formatCurrency,
    },
  });

  return confirmationTemplate(templateData);
};

const renderText = (
  giftCardOrder,
  knetResponse,
  templateId,
  receiverAsCustomer
) => {
  const createdAt = moment(giftCardOrder.createdAt)
    .tz(timezone)
    .format('HH:mm');

  const customer = giftCardOrder.customer;
  const customerName = customer.firstName + ' ' + customer.lastName;
  const customerPhone = customer.phoneNumber
    ? formatKuwaitiPhoneNumber(customer.phoneNumber)
    : '';
  let preferredLanguage = customer.preferredLanguage
    ? customer.preferredLanguage.toLowerCase()
    : 'en';

  if (templateId === 'receiver') {
    preferredLanguage =
      receiverAsCustomer && receiverAsCustomer.preferredLanguage
        ? receiverAsCustomer.preferredLanguage.toLowerCase()
        : 'en';
  }

  const orderTexts = `${formatCurrency(
    giftCardOrder.amount,
    giftCardOrder.currency.decimalPlace,
    giftCardOrder.currency.symbol[preferredLanguage]
  )} \tCofe Gift Card \t${formatCurrency(
    giftCardOrder.amount,
    giftCardOrder.currency.decimalPlace,
    giftCardOrder.currency.symbol[preferredLanguage]
  )} \n`;

  const total = formatCurrency(
    giftCardOrder.amount,
    giftCardOrder.currency.decimalPlace,
    giftCardOrder.currency.symbol[preferredLanguage]
  );

  let knetSummary = `KNET Payment Summary:
Result: ${get(knetResponse, 'result', 'n/a')}`;

  if (get(giftCardOrder, 'amount', 0) > 0) {
    knetSummary += `
Amount: ${total}
Reference ID: ${knetResponse.ref}
Payment ID: ${knetResponse.paymentid}
Merchant Track ID: ${knetResponse.trackid}`;
  }

  const knetContent = `Payment succeeded for your ${formatCurrency(
    giftCardOrder.amount,
    giftCardOrder.currency.decimalPlace,
    giftCardOrder.currency.symbol[preferredLanguage]
  )} Cofe Gift Card.

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

TOTAL GIFT CARD VALUE: ${formatCurrency(
    toNumber(giftCardOrder.amount),
    giftCardOrder.currency.decimalPlace,
    giftCardOrder.currency.symbol[preferredLanguage]
  )}
`;

  return composedText;
};
const renderSubject = (giftCardOrder, templateId, receiverAsCustomer) => {
  const customer = giftCardOrder.customer;
  let preferredLanguage = customer.preferredLanguage
    ? customer.preferredLanguage.toLowerCase()
    : 'en';

  if (templateId === 'receiver') {
    preferredLanguage =
      receiverAsCustomer && receiverAsCustomer.preferredLanguage
        ? receiverAsCustomer.preferredLanguage.toLowerCase()
        : 'en';
  }

  let subject = `Gift Card Confirmation: ${giftCardOrder.shortCode}`;
  if (templateId === 'redeemed') {
    subject = 'Your gift card has been redeemed!';
  }
  if (templateId === 'receiver' || templateId === 'receiver-non-app') {
    subject = 'You\'ve received a Gift Card!';
  }
  if (preferredLanguage === 'ar') {
    subject = `Gift Card Confirmation: ${giftCardOrder.shortCode}`;
    if (templateId === 'redeemed') {
      subject = 'تم إسترداد بطاقة الهدية';
    }
    if (templateId === 'receiver' || templateId === 'receiver-non-app') {
      subject = 'وصلت لك هدية!';
    }
  }
  if (preferredLanguage === 'tr') {
    subject = `Hediye Kartı Doğrulama Kodu: ${giftCardOrder.shortCode}`;
    if (templateId === 'redeemed') {
      subject = 'Hediye kartınız kullanılmıştır';
    }
    if (templateId === 'receiver' || templateId === 'receiver-non-app') {
      subject = 'Bir COFE Hediye Kartı aldınız!';
    }
  }
  return subject;
};

const renderConfirmationEmail = async (
  context,
  giftCardOrderId,
  knetResponse,
  templateId
) => {
  const results = await context.graphql(query, { id: giftCardOrderId }, true);
  const giftCardOrder = results.data.giftCardOrderForCallbacks;

  const customer = get(giftCardOrder, 'customer', null);
  const receiverEmail = get(giftCardOrder, 'receiverEmail', '');
  const receiverName = get(giftCardOrder, 'receiverName', '');

  const receiverAsCustomer = await context.customer.getByEmail(
    receiverEmail || ''
  );
  if (templateId === 'receiver' && !receiverAsCustomer) {
    templateId = 'receiver-non-app';
  }
  const res = {
    subject: renderSubject(giftCardOrder, templateId, receiverAsCustomer),
    text: renderText(
      giftCardOrder,
      knetResponse,
      templateId,
      receiverAsCustomer
    ),
    html: renderTemplate(
      giftCardOrder,
      knetResponse,
      templateId,
      receiverAsCustomer
    ),
  };
  if (templateId === 'receipt') {
    res.customerId = customer ? customer.id : null;
  }
  if (templateId === 'receiver-non-app') {
    res.receiverEmail = receiverEmail;
    res.receiverName = receiverName;
  }
  if (templateId === 'receiver') {
    res.customerId = receiverAsCustomer ? receiverAsCustomer.id : null;
  }

  if (templateId === 'redeemed') {
    res.customerId = customer ? customer.id : null;
  }
  res.giftCardOrder = giftCardOrder;
  return res;
};

module.exports = {
  renderConfirmationEmail,
};
