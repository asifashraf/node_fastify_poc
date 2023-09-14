const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { get, template, replace, find } = require('lodash');
const { toGateAddress, jsonToObject } = require('../../lib/util');
const Money = require('../../lib/currency');

const query = require('./email-confirmation-query');

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
  SUBSCRIPTION_DISCOUNT: { en: 'Subscription Discount', ar: 'خصم الاشتراك' },
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

const renderSubject = (orderSet, successful, paymentPending) => {
  if (!successful) {
    /* eslint no-negated-condition: "error" */
    if (!paymentPending) {
      return `Payment Failure: ${orderSet.shortCode}`;
    }
    return `Payment Pending: ${orderSet.shortCode}`;
  }
  return `Order Confirmation: ${orderSet.shortCode}`;
};

const renderTextForOrder = (order, index, timeZoneIdentifier) => {
  const fulfillmentName =
    order.fulfillment.type === 'DELIVERY' ? 'Delivery' : 'Pickup';
  const time = moment(order.fulfillment.time)
    .tz(timeZoneIdentifier)
    .format('DD/MM/YY HH:mm');
  return `${fulfillmentName} ${index + 1}: ${time}`;
};

const renderTextForItem = (item, currency, preferredLanguage) => {
  const quantity = item.quantity;
  const name = item.name[preferredLanguage];
  const itemPrice = item.selectedOptions.reduce((a, o) => a + o.price, 0);
  const priceString = formatCurrency(
    itemPrice,
    currency.decimalPlace,
    currency.symbol[preferredLanguage]
  );
  let text = `${name}\nItem Price: ${priceString}\nQuantity: ${quantity}`;
  if (item.selectedOptions.length > 0) {
    text +=
      '\n' +
      item.selectedOptions.map(i => i.value[preferredLanguage]).join('\n');
  }
  if (item.note) {
    text += `\n${item.note}`;
  }
  return text;
};

const renderTemplate = (orderSet, successful, knetResponse) => {
  knetResponse = jsonToObject(knetResponse);

  const shortCode = orderSet.shortCode;
  const paymentMethod = orderSet.paymentMethod;
  const customer = orderSet.customer;
  const preferredLanguage = customer.preferredLanguage
    ? customer.preferredLanguage.toLowerCase()
    : 'en';
  const brandLocation = orderSet.brandLocation;
  const brand = brandLocation.brand;
  const items = orderSet.items;
  const currency = orderSet.currency;
  const countryPhoneNumber = get(
    orderSet,
    'currency.country.servicePhoneNumber',
    '---'
  );

  const invoiceComponents = get(orderSet, 'computeInvoice.components', []);
  const timeZoneIdentifier = brandLocation.timeZoneIdentifier;
  const isPickup = orderSet.fulfillment.type === 'PICKUP';
  const isDelivery = orderSet.fulfillment.type === 'DELIVERY';
  const isScheduled = isDelivery && orderSet.fulfillment.asap === false;
  const isDeliverToCar = orderSet.fulfillment.deliverToVehicle;
  const feeType = isDelivery ? 'Delivery' : 'Service';
  const fulfilmentTime = moment(orderSet.fulfillment.time)
    .tz(timeZoneIdentifier)
    .format('HH:mm');

  const couponCode = get(orderSet, 'coupon.code');
  const couponAmount = get(orderSet, 'couponAmount');

  const orderCount = 1;
  const deliveryAddress = orderSet.fulfillment.deliveryAddress;

  let customerAddress = `<ol>
  ${
  deliveryAddress
    ? deliveryAddress.extraFields.map(field =>
      (field.value
        ? `<li>${field.name[preferredLanguage]}: ${field.value}</li>`
        : '')
    )
    : null
}
  </ol>`;

  if (deliveryAddress) {
    if (deliveryAddress.extraFields.length === 0) {
      if (deliveryAddress) {
        if (deliveryAddress.type === 'OFFICE_BUILDING') {
          customerAddress = `${deliveryAddress.buildingName}`;
        } else if (deliveryAddress.type === 'AIRPORT') {
          customerAddress = toGateAddress(deliveryAddress);
        } else {
          customerAddress = `${deliveryAddress.streetNumber} ${deliveryAddress.street}`;
        }
        if (deliveryAddress.floor) {
          customerAddress += `\n${deliveryAddress.floor}`;
        }
        if (deliveryAddress.unitNumber) {
          customerAddress += `\n${deliveryAddress.unitNumber}`;
        }
      }
    }
  }

  const orders = [
    {
      fulfillmentName: orderSet.fulfillment.type,
      time: moment(orderSet.fulfillment.time)
        .tz(timeZoneIdentifier)
        .format('DD/MM/YY HH:mm'),
      index: 1,
    },
  ];
  const templateData = {
    invoiceComponents,
    countryPhoneNumber,
    shortCode,
    orderCount,
    fulfilmentTime,
    customerAddress,
    brand,
    brandLocation,
    currency,
    createdAtFormatted: moment(orderSet.createdAt).format('D MMMM YYYY'),
    customerName: `${customer.firstName} ${customer.lastName}`,
    fee: orderSet.fee,
    feeType,
    paymentMethod,
    isPickup,
    isDelivery,
    isDeliverToCar,
    isScheduled,
    items,
    orders,
    knetResponse,
    isCash: get(knetResponse, 'isCash', false),
    isCashPaid: get(knetResponse, 'paid', false),
    couponCode,
    couponAmount,
    phoneNumber: customer.phoneNumber,
    statusCode: orderSet.statusCode,
    subtotal: orderSet.subtotal,
    total: orderSet.total,
    vehicleColor: orderSet.fulfillment.vehicleColor,
    vehicleDescription: orderSet.fulfillment.vehicleDescription,
    year: moment()
      .tz(timeZoneIdentifier)
      .year(),
  };

  const templateDir = path.resolve('templates', 'dist', preferredLanguage);

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
      findInvoiceComponent,
      amountPaidByPaymentMethod,
    },
  });
  return confirmationTemplate(templateData);
};

const renderText = (orderSet, successful, knetResponse, pending) => {
  const customer = orderSet.customer;
  const preferredLanguage = customer.preferredLanguage
    ? customer.preferredLanguage.toLowerCase()
    : 'en';
  const shortCode = orderSet.shortCode;
  const timeZoneIdentifier = orderSet.brandLocation.timeZoneIdentifier;

  const brandLocation = orderSet.brandLocation;
  const brand = brandLocation.brand;

  const createdAt = moment(orderSet.createdAt)
    .tz(timeZoneIdentifier)
    .format('HH:mm');

  const couponCode = get(orderSet, 'coupon.code');
  const couponAmount = formatCurrency(
    get(orderSet, 'couponAmount', 0),
    orderSet.currency.decimalPlace,
    orderSet.currency.symbol[preferredLanguage]
  );
  const numberOfItems = orderSet.items.length;
  const pluralizedItem = numberOfItems > 1 ? 'items' : 'item';
  const numberOfOrders = 1;

  const pluralizedOrders =
    numberOfOrders > 1 ? 'scheduled orders' : 'scheduled order';

  const customerName = customer.firstName + ' ' + customer.lastName;
  const customerPhone = customer.phoneNumber
    ? formatKuwaitiPhoneNumber(customer.phoneNumber)
    : '';

  const fulfillmentType = orderSet.fulfillment.type;

  let customerAddress = null;
  let noteToCourier = null;

  if (orderSet.fulfillment.deliveryAddress) {
    const deliveryAddress = orderSet.fulfillment.deliveryAddress;
    customerAddress = `${
      deliveryAddress
        ? deliveryAddress.extraFields.map(field =>
          (field.value
            ? `${field.name[preferredLanguage]}: ${field.value}\n`
            : '')
        )
        : null
    }
    `;

    if (deliveryAddress.extraFields.length === 0) {
      if (deliveryAddress.type === 'OFFICE_BUILDING') {
        customerAddress = `${deliveryAddress.buildingName}`;
      } else if (deliveryAddress.type === 'AIRPORT') {
        customerAddress = toGateAddress(deliveryAddress);
      } else {
        customerAddress = `${deliveryAddress.streetNumber} ${deliveryAddress.street}`;
      }
      if (deliveryAddress.floor) {
        customerAddress += `\n${deliveryAddress.floor}`;
      }
      if (deliveryAddress.unitNumber) {
        customerAddress += `\n${deliveryAddress.unitNumber}`;
      }
      if (deliveryAddress.note) {
        noteToCourier = deliveryAddress.note;
      }
    }
  }

  const orderTexts = [orderSet]
    .map((o, i) => renderTextForOrder(o, i, timeZoneIdentifier))
    .join('\n\n- - - - -\n\n');

  const itemTexts = orderSet.items
    .map(item => renderTextForItem(item, orderSet.currency, preferredLanguage))
    .join('\n\n- - - - -\n\n');

  const subtotal = formatCurrency(
    orderSet.subtotal,
    orderSet.currency.decimalPlace,
    orderSet.currency.symbol[preferredLanguage]
  );

  const feeName = (fulfillmentType === 'DELIVERY'
    ? 'Delivery Fee'
    : 'Service Fee'
  ).toUpperCase();

  const fee = formatCurrency(
    orderSet.fee,
    orderSet.currency.decimalPlace,
    orderSet.currency.symbol[preferredLanguage]
  );
  const total = formatCurrency(
    orderSet.total,
    orderSet.currency.decimalPlace,
    orderSet.currency.symbol[preferredLanguage]
  );

  let knetContent;

  let knetSummary = `KNET Payment Summary:
Result: ${get(knetResponse, 'result', 'n/a')}`;

  if (get(orderSet, 'total', 0) > 0) {
    knetSummary += `
Amount: ${total}
Reference ID: ${knetResponse.ref}
Payment ID: ${knetResponse.paymentid}
Merchant Track ID: ${knetResponse.trackid}`;
  }

  if (successful) {
    knetContent = `Payment succeeded for your ${orderSet.brandLocation.brand.name[preferredLanguage]} order.

${knetSummary}`;
  } else if (pending) {
    knetContent = `Payment pending for your ${orderSet.brandLocation.brand.name[preferredLanguage]} order.

${knetSummary}`;
  } else {
    knetContent = `Payment failed for your ${orderSet.brandLocation.brand.name[preferredLanguage]} order.

${knetSummary}`;
  }

  let composedText = `
${knetContent}

**********

ORDER CODE: ${shortCode}
ORDERED AT: ${createdAt}

${numberOfItems} ${pluralizedItem}, ${numberOfOrders} ${pluralizedOrders}

${customerName}
${customerPhone}
${customerAddress ? customerAddress : ''}
${noteToCourier ? noteToCourier : ''}
**********

${orderTexts}

**********

${itemTexts}

**********

SUBTOTAL: ${subtotal}
${feeName}: ${fee}`;

  if (couponCode) {
    composedText += `
COUPON (${couponCode}): -${couponAmount}
  `;
  }

  composedText += `
TOTAL: ${total}
  `;

  if (brand.country.hasVat) {
    composedText += `
**********
VAT(%): ${brand.country.vat}
VAT ID: ${brand.country.vatId}
**********
  `;
  }

  return composedText;
};

const renderConfirmationEmail = async (
  context,
  orderSetId,
  paymentStatusName,
  knetResponse
) => {
  try {
    const successful = paymentStatusName === paymentStatusNames.PAYMENT_SUCCESS;
    const pending = paymentStatusName === paymentStatusNames.PAYMENT_PENDING;

    // Flag the graphql method so we do not check permissions on queries we do internally
    const results = await context.graphql(query, { id: orderSetId }, true);
    // console.log(JSON.stringify(results, null, 5));
    const orderSet = results.data.orderSetForCallbacks;
    return Promise.resolve({
      customerId: orderSet.customer.id,
      subject: renderSubject(orderSet, successful, pending),
      text: renderText(orderSet, successful, knetResponse, pending),
      html: renderTemplate(orderSet, successful, knetResponse, pending),
    });
  } catch (err) {
    console.log('Error: ', err);
  }
};

module.exports = {
  renderConfirmationEmail,
};
