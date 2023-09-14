const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const { get, template, replace, find, map } = require('lodash');
const { jsonToObject, now, toGateAddress } = require('../../lib/util');
const {
  storeOrderSetStatusName,
  storeOrderStatusName,
} = require('./../root/enums');
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
const renderSubject = (storeOrderSet, successful, paymentPending) => {
  if (!successful) {
    /* eslint no-negated-condition: "error" */
    if (!paymentPending) {
      return `Payment Failure: ${storeOrderSet.shortCode}`;
    }
    return `Payment Pending: ${storeOrderSet.shortCode}`;
  }
  return `Order Confirmation: ${storeOrderSet.shortCode}`;
};

const renderTemplate = (
  storeOrderSet,
  successful,
  knetResponse,
  pending,
  options = {}
) => {
  knetResponse = jsonToObject(knetResponse);

  const shortCode = storeOrderSet.shortCode;
  const paymentMethod = storeOrderSet.paymentMethod;
  const customer = storeOrderSet.customer;
  const preferredLanguage = customer.preferredLanguage
    ? customer.preferredLanguage.toLowerCase()
    : 'en';
  const currency = storeOrderSet.currency;
  const country = storeOrderSet.country;
  const timeZoneIdentifier = country.timeZoneIdentifier;

  let storeOrders = storeOrderSet.storeOrders;
  let orderStatus = storeOrderSetStatusName.PLACED;
  let deliveredAtFormatted = null;
  let dispatchedAtFormatted = null;
  if (options.storeOrderId && options.storeOrderStatusChange) {
    storeOrders = [
      find(storeOrderSet.storeOrders, so => so.id === options.storeOrderId),
    ];
    orderStatus = storeOrders[0].currentStatus;
    const orderStatusHistory = storeOrders[0].statusHistory;
    if (orderStatus === storeOrderStatusName.DISPATCHED) {
      const dispatchedStatus = find(
        orderStatusHistory,
        o => o.status === storeOrderStatusName.DISPATCHED
      );
      if (dispatchedStatus) {
        dispatchedAtFormatted = moment(dispatchedStatus.created)
          .tz(timeZoneIdentifier)
          .format('LLLL');
      }
    }
    if (orderStatus === storeOrderStatusName.DELIVERED) {
      const deliveredStatus = find(
        orderStatusHistory,
        o => o.status === storeOrderStatusName.DELIVERED
      );
      if (deliveredStatus) {
        deliveredAtFormatted = moment(deliveredStatus.created)
          .tz(timeZoneIdentifier)
          .format('LLLL');
      }
    }
  }

  const countryPhoneNumber = get(
    storeOrderSet,
    'country.servicePhoneNumber',
    '---'
  );

  const invoiceComponents = get(storeOrderSet, 'computeInvoice.components', []);

  const fulfillmentType = storeOrderSet.fulfillment.type;

  const isPickup = fulfillmentType === 'PICKUP';
  const isDelivery = fulfillmentType === 'DELIVERY';
  const isScheduled = isDelivery && storeOrderSet.fulfillment.asap === false;
  const isDeliverToCar = storeOrderSet.fulfillment.deliverToVehicle;
  const deliveryEstimate = moment(now.get())
    .add(Number(storeOrderSet.fulfillment.deliveryEstimate), 'hours')
    .format('LLLL');
  const feeType = isDelivery ? 'Delivery' : 'Service';
  const fulfilmentTime = moment(storeOrderSet.fulfillment.time)
    .tz(timeZoneIdentifier)
    .format('HH:mm');

  const deliveryAddress = storeOrderSet.fulfillment.deliveryAddress;

  let customerAddress = '';
  if (deliveryAddress) {
    map(deliveryAddress.extraFields, field => {
      if (field.value) {
        customerAddress += `${field.name[preferredLanguage]}: ${field.value}<br>`;
        return field;
      }
    });
  }

  if (deliveryAddress) {
    if (deliveryAddress.extraFields.length === 0) {
      if (deliveryAddress) {
        if (deliveryAddress.type === 'OFFICE_BUILDING') {
          customerAddress = `${deliveryAddress.buildingName}<br>`;
        } else if (deliveryAddress.type === 'AIRPORT') {
          customerAddress = `${toGateAddress(deliveryAddress)}<br>`;
        } else {
          customerAddress = `${deliveryAddress.streetNumber} ${deliveryAddress.street}<br>`;
        }
        if (deliveryAddress.floor) {
          customerAddress += `${deliveryAddress.floor}<br>`;
        }
        if (deliveryAddress.unitNumber) {
          customerAddress += `\n${deliveryAddress.unitNumber}<br>`;
        }
      }
    }
  }

  const templateData = {
    orderStatus,
    invoiceComponents,
    countryPhoneNumber,
    shortCode,
    storeOrders,
    timeZoneIdentifier,
    isPickup,
    isDelivery,
    fulfillmentType,
    isScheduled,
    isDeliverToCar,
    feeType,
    fulfilmentTime,
    deliveryEstimate,
    country,
    currency,
    customerAddress,
    deliveryAddress,
    createdAtFormatted: moment(storeOrderSet.created)
      .tz(timeZoneIdentifier)
      .format('LLLL'),
    deliveredAtFormatted,
    dispatchedAtFormatted,
    customerName: `${customer.firstName} ${customer.lastName}`,
    fee: storeOrderSet.fee,
    paymentMethod,
    knetResponse,
    phoneNumber: customer.phoneNumber,
    subtotal: storeOrderSet.subtotal,
    total: storeOrderSet.total,
    year: moment().year(),
    storeOrderStatusChange: Boolean(options.storeOrderStatusChange),
  };

  const templateDir = path.resolve(
    'templates',
    'dist',
    'store',
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
      findInvoiceComponent,
      amountPaidByPaymentMethod,
    },
  });
  return confirmationTemplate(templateData);
};

const renderTextForOrder = (order, index, timeZoneIdentifier) => {
  const fulfillmentName = 'Delivery';
  const time = moment(order.fulfillment.time)
    .tz(timeZoneIdentifier)
    .format('LLLL');
  return `${fulfillmentName} ${index + 1}: ${time}`;
};

const renderTextForItem = (item, currency, preferredLanguage) => {
  const brand = item.brand.name[preferredLanguage];
  const priceString = amount =>
    formatCurrency(
      amount,
      currency.decimalPlace,
      currency.code[preferredLanguage]
    );
  let text = `${brand}\nNumber of products: ${item.products.length}`;
  if (item.products.length > 0) {
    text +=
      '\n' +
      item.products
        .map(p => {
          return `${p.name[preferredLanguage]}\nProduct Price: ${priceString(
            p.price
          )}\nQuantity: ${p.quantity}`;
        })
        .join('\n');
  }
  return text;
};

const renderText = (
  storeOrderSet,
  successful,
  knetResponse,
  pending,
  options = {}
) => {
  const customer = storeOrderSet.customer;
  const currency = storeOrderSet.currency;
  const country = storeOrderSet.country;
  const timeZoneIdentifier = country.timeZoneIdentifier;

  const preferredLanguage = customer.preferredLanguage
    ? customer.preferredLanguage.toLowerCase()
    : 'en';
  const shortCode = storeOrderSet.shortCode;

  const createdAt = moment(storeOrderSet.created)
    .tz(timeZoneIdentifier)
    .format('HH:mm');

  const numberOfItems = storeOrderSet.storeOrders.length;
  const numberOfOrders = numberOfItems;

  const pluralizedOrders = numberOfOrders > 1 ? 'orders' : 'order';

  const customerName = customer.firstName + ' ' + customer.lastName;
  const customerPhone = customer.phoneNumber
    ? formatKuwaitiPhoneNumber(customer.phoneNumber)
    : '';
  const fulfillmentType = storeOrderSet.fulfillment.type;

  let customerAddress = null;
  let noteToCourier = null;

  if (storeOrderSet.fulfillment.deliveryAddress) {
    const deliveryAddress = storeOrderSet.fulfillment.deliveryAddress;
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

  let storeOrders = storeOrderSet.storeOrders;
  if (options.storeOrderId && options.storeOrderStatusChange) {
    storeOrders = [
      find(storeOrderSet.storeOrders, so => so.id === options.storeOrderId),
    ];
    // orderStatus = storeOrders[0].currentStatus;
  }

  const orderTexts = [storeOrderSet]
    .map((o, i) => renderTextForOrder(o, i, timeZoneIdentifier))
    .join('\n\n- - - - -\n\n');

  const itemTexts = storeOrders
    .map(item =>
      renderTextForItem(item, storeOrderSet.currency, preferredLanguage)
    )
    .join('\n\n- - - - -\n\n');

  const subtotal = formatCurrency(
    storeOrderSet.subtotal,
    currency.decimalPlace,
    currency.code[preferredLanguage]
  );

  const feeName = (fulfillmentType === 'DELIVERY'
    ? 'Delivery Fee'
    : 'Service Fee'
  ).toUpperCase();

  const fee = formatCurrency(
    storeOrderSet.fee,
    currency.decimalPlace,
    currency.code[preferredLanguage]
  );
  const total = formatCurrency(
    storeOrderSet.total,
    currency.decimalPlace,
    currency.code[preferredLanguage]
  );

  let knetContent;

  let knetSummary = `KNET Payment Summary:
Result: ${get(knetResponse, 'result', 'n/a')}`;

  if (get(storeOrderSet, 'total', 0) > 0) {
    knetSummary += `
Amount: ${total}
Reference ID: ${knetResponse.ref}
Payment ID: ${knetResponse.paymentid}
Merchant Track ID: ${knetResponse.trackid}`;
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
  if (!options.storeOrderStatusChange) {
    orderDetails = `
    SUBTOTAL: ${subtotal}
    ${feeName}: ${fee}
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
${customerAddress}
${noteToCourier}
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
  storeOrderSetId,
  paymentStatusName,
  knetResponse
) => {
  const successful = paymentStatusName === paymentStatusNames.PAYMENT_SUCCESS;
  const pending = paymentStatusName === paymentStatusNames.PAYMENT_PENDING;

  // Flag the graphql method so we do not check permissions on queries we do internally
  const results = await context.graphql(query, { id: storeOrderSetId }, true);
  const storeOrderSet = results.data.storeOrderSetForCallbacks;
  return Promise.resolve({
    customerId: storeOrderSet.customer.id,
    subject: renderSubject(storeOrderSet, successful, pending),
    text: renderText(storeOrderSet, successful, knetResponse, pending),
    html: renderTemplate(storeOrderSet, successful, knetResponse, pending),
  });
};

const renderStoreOrderStatusEmail = async (
  context,
  storeOrderSetId,
  paymentStatusName,
  storeOrderId
) => {
  try {
    const successful = paymentStatusName === paymentStatusNames.PAYMENT_SUCCESS;
    const pending = paymentStatusName === paymentStatusNames.PAYMENT_PENDING;

    // Flag the graphql method so we do not check permissions on queries we do internally
    const results = await context.graphql(query, { id: storeOrderSetId }, true);
    const storeOrderSet = results.data.storeOrderSetForCallbacks;
    return Promise.resolve({
      customerId: storeOrderSet.customer.id,
      subject: renderSubject(storeOrderSet, successful, pending),
      text: renderText(storeOrderSet, successful, '{}', pending, {
        storeOrderId,
        storeOrderStatusChange: true,
      }),
      html: renderTemplate(storeOrderSet, successful, '{}', pending, {
        storeOrderId,
        storeOrderStatusChange: true,
      }),
    });
  } catch (err) {
    console.log('Error: ', err);
  }
};

module.exports = {
  renderConfirmationEmail,
  renderStoreOrderStatusEmail,
};
