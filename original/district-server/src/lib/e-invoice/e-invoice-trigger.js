const { eInvoice } = require('../../../config');
const axios = require('axios');
const { paymentSchemes } = require('../../payment-service/enums');
const { kinesisEventTypes } = require('../../lib/aws-kinesis-logging');
const CurrencyValue = require('../../lib/currency');
const { brandLocationPriceRuleAction, brandLocationPriceRuleType } = require('../../schema/root/enums');
const { paymentStatusOrderType } = require('../../schema/root/enums');

const unavailablePaymentMethods = [paymentSchemes.CASH];
const defaultDecimalPlace = 4;
const defaultMinTaxValue = 0.01;

const sendPayloadWithHttp = async (endpoint, payload) => {
  const config = {
    method: 'post',
    url: endpoint,
    headers: {
      'Content-Type': 'application/json',
    },
    data: JSON.stringify(payload),
  };
  return axios(config);
};

const generateXmlLine = (itemCount, item, calculationRes) => {
  const invoiceInvoiceLine = {
    itemNumber: itemCount,
    itemInvoicedQuantity: item.quantity,
    itemLineExtensionAmount: calculationRes.itemPriceWithoutTaxViaQuantity.toString(),
    itemChargeIndicator: false,
    itemAllowanceChargeReason: `%${calculationRes.discountRatio || 0}`,
    itemMultiplierFactorNumeric: calculationRes.discountRatioMultiplier.toString(),
    itemAmount: calculationRes.discountValueViaQuantity.toString(),
    itemBaseAmount: calculationRes.itemCompareAtPriceWithoutTax.toString(),
    itemTaxAmount: calculationRes.taxPriceValueViaQuantity.toString(),
    itemTaxableAmount: calculationRes.itemPriceWithoutTaxViaQuantity.toString(),
    itemPercent: calculationRes.taxPriceRatio.toString(),
    itemDesc: '',
    itemName: item.name ? item.name.toUpperCase() : '',
    itemSellersItemIdentification: '',
    itemPriceAmount: calculationRes.itemCompareAtPriceWithoutTax.toString(),
    itemPriceAmountViaQuantity: calculationRes.itemCompareAtPriceWithoutTaxViaQuantity.toString(),
    itemPriceWithTaxAmountViaQuantity: calculationRes.itemPriceWithTaxViaQuantity.toString(),
    itemCompateAtPriceWithTaxAmountViaQuantity: calculationRes.itemCompareAtPriceWithTaxViaQuantity.toString(),
  };
  return invoiceInvoiceLine;
};

const calculateLine = (eInvoiceCountry, currency, itemCount, totalAmount, totalDiscountWithoutItems, item) => {
  const ratioInTotal = ((item.price * item.quantity) / Number(totalAmount)) * 100; // toplam fiyatta ürünün ağırlığı
  const perDiscount = Number(totalDiscountWithoutItems) * ratioInTotal / 100; // toplam indirimden yansıyacak olan
  const perQuantityDiscount = perDiscount / item.quantity; // adet başına düşen
  const finalItemPrice = (item.price - perQuantityDiscount) > 0 ? item.price - perQuantityDiscount : 0;
  const params = {
    eInvoiceCountry,
    currency,
    undefined,
    type: item.type,
    quantity: item.quantity,
    itemPrice: finalItemPrice,
    itemCompareAtPrice: item.compareAtPrice,
  };
  const calculationRes = calculateItem(params);
  return generateXmlLine(itemCount, item, calculationRes);
};

const createEInvoiceForOrderSet = async ({ ctx, orderSet }) => {
  if (!ctx) throw new Error('Invalid context');
  if (!orderSet) throw new Error('Invalid orderSet');

  const { paymentMethod } = orderSet;
  if (!unavailablePaymentMethods.includes(paymentMethod)) {
    await prepareEInvoiceForOrderSet({ ctx, orderSet });
  }
};

const calculateTaxTotal = items => {
  const invoiceTaxTotalList = [];
  const itemsByTax = groupBy(items, t => t.itemPercent);
  const reducerItemTaxAmount = (p, c) => Number(p) + Number(c ? c.itemTaxAmount : 0);
  const reducerItemTaxableAmount = (p, c) => Number(p) + Number(c ? c.itemTaxableAmount : 0);
  itemsByTax.forEach(function (value, key) {
    const totalItemTaxAmount = value.reduce(reducerItemTaxAmount, 0);
    const totalItemTaxableAmount = value.reduce(reducerItemTaxableAmount, 0);
    const res = {
      taxAmount: totalItemTaxAmount.toFixed(2),
      taxableAmount: totalItemTaxableAmount.toFixed(2),
      taxPercent: Number(key).toFixed(2),
    };
    invoiceTaxTotalList.push(res);
  });
  return invoiceTaxTotalList;
};

const calculatePriceWithoutTax = (priceWithTax, taxRatio) => {
  const itemPrice = priceWithTax;
  const priceWithoutTax = taxRatio > 0 ? (Number(itemPrice) / (1 + (Number(taxRatio) / 100))) : Number(itemPrice);
  const taxPrice = itemPrice - priceWithoutTax;
  return {
    priceWithoutTax,
    taxPrice,
  };
};

const calculateItemArgs = (currency, quantity, itemCompareAtPrice, itemPrice, taxRatio) => {
  const { decimalPlace: dp, lowestDenomination: lw } = currency;
  const decimalPlace = defaultDecimalPlace || dp;
  const { priceWithoutTax: itemCompareAtPriceWithoutTax }
    = calculatePriceWithoutTax(itemCompareAtPrice, taxRatio);
  const { priceWithoutTax: itemPriceWithoutTax, taxPrice: taxPriceValue }
    = calculatePriceWithoutTax(itemPrice, taxRatio);
  const itemPricesDiff = itemCompareAtPriceWithoutTax - itemPriceWithoutTax;
  const itemPriceWithoutTaxViaQuantity = (itemPriceWithoutTax * quantity);
  const discountRatio = Number(((itemPricesDiff) / itemCompareAtPriceWithoutTax) * 100);
  const discountValue = Number((itemCompareAtPriceWithoutTax * discountRatio) / 100);
  return {
    itemCompareAtPriceWithTaxViaQuantity: new CurrencyValue(itemCompareAtPrice * quantity, decimalPlace, lw),
    itemCompareAtPriceWithTax: new CurrencyValue(itemCompareAtPrice, decimalPlace, lw),
    itemPriceWithTaxViaQuantity: new CurrencyValue(itemPrice * quantity, decimalPlace, lw),
    itemPriceWithTax: new CurrencyValue(itemPrice, decimalPlace, lw),

    itemCompareAtPriceWithoutTaxViaQuantity: new CurrencyValue(itemCompareAtPriceWithoutTax * quantity, decimalPlace, lw),
    itemCompareAtPriceWithoutTax: new CurrencyValue(itemCompareAtPriceWithoutTax, decimalPlace, lw),
    itemPriceWithoutTaxViaQuantity: new CurrencyValue(itemPriceWithoutTaxViaQuantity > defaultMinTaxValue
      ? itemPriceWithoutTaxViaQuantity
      : defaultMinTaxValue, decimalPlace, lw),
    itemPriceWithoutTax: new CurrencyValue(itemPriceWithoutTax, decimalPlace, lw),

    itemPricesDiff: new CurrencyValue(itemPricesDiff, decimalPlace, lw),
    discountRatio: discountRatio.toFixed(decimalPlace),
    discountRatioMultiplier: (discountRatio / 100),
    discountValueViaQuantity: new CurrencyValue((discountValue * quantity), decimalPlace, lw),
    discountValue: new CurrencyValue((discountValue), decimalPlace, lw),

    taxPriceValueViaQuantity: new CurrencyValue((taxPriceValue * quantity), decimalPlace, lw),
    taxPriceValue: new CurrencyValue((taxPriceValue), decimalPlace, lw),
    taxPriceRatio: taxRatio,
    taxPriceRatioMultiplier: (taxRatio / 100),
  };
};

const calculatePriceViaPriceRule = (priceRules, price) => {
  let currentPrice = price;
  // Price Rules List should only contain at most one item
  priceRules.map(priceRule => {
    let priceRuleValue = 0;
    switch (priceRule.type) {
      case brandLocationPriceRuleType.FIXED: {
        priceRuleValue =
          priceRule.action === brandLocationPriceRuleAction.SUBTRACT
            ? parseFloat(priceRule.value) * +1
            : parseFloat(priceRule.value) * -1;
        currentPrice += priceRuleValue;
        break;
      }

      case brandLocationPriceRuleType.PERCENT: {
        priceRuleValue =
          priceRule.action === brandLocationPriceRuleAction.SUBTRACT
            ? (100 + parseFloat(priceRule.value)) / 100
            : (100 - parseFloat(priceRule.value)) / 100;
        currentPrice *= priceRuleValue;
        break;
      }
      default:
        priceRuleValue = 0;
    }
    currentPrice = currentPrice < 0 ? 0 : currentPrice;
    // we will just ignore the returned rule, we are interested in currentPrice
    return priceRule;
  });
  return currentPrice;
};

const calculateItem = ({
  eInvoiceCountry,
  currency,
  branchGeneralPriceRules,
  type,
  quantity,
  itemPrice,
  itemCompareAtPrice,
}) => {
  if (!itemCompareAtPrice) {
    if (branchGeneralPriceRules && branchGeneralPriceRules.length > 0) {
      itemCompareAtPrice = calculatePriceViaPriceRule(branchGeneralPriceRules, itemPrice);
    } else {
      itemCompareAtPrice = itemPrice;
    }
  }
  const typeLwr = type.toLowerCase();
  if (eInvoiceCountry.tax && currency && typeLwr && eInvoiceCountry.tax[typeLwr]) {
    const taxRatio = Number(eInvoiceCountry.tax[typeLwr] || 0);
    return {
      ...calculateItemArgs(currency, quantity, itemCompareAtPrice, itemPrice, taxRatio),
    };
  }

  throw new Error('Invalid Tax Values');
};

function groupBy(list, keyGetter) {
  const map = new Map();
  list.forEach(item => {
    const key = keyGetter(item);
    const collection = map.get(key);
    if (!collection) {
      map.set(key, [item]);
    } else {
      collection.push(item);
    }
  });
  return map;
}

const validationEInvoice = triggerPayload => {
  const {
    ctx,
    orderType,
    orderId,
    orderCreatedAt,
    customerId,
    countryId,
    items,
    components,
  } = triggerPayload;

  if (!ctx) throw new Error('Invalid context');
  if (!orderType) throw new Error('Invalid orderType');
  if (!orderId) throw new Error('Invalid orderId');
  if (!orderCreatedAt) throw new Error('Invalid orderCreatedAt');
  if (!customerId) throw new Error('Invalid customerId');
  if (!countryId) throw new Error('Invalid countryId');
  if (!items) throw new Error('Invalid items');
  if (!components) throw new Error('Invalid components');
};

const prepareEInvoiceForOrderSet = async ({ ctx, orderSet }) => {
  const [rawItems, { components: rawComponents }, country] = await Promise.all([
    ctx.orderItem.getWithMenuItemByOrderSetId(orderSet.id),
    ctx.orderSet.getInvoiceByOrderSetId(orderSet.id),
    ctx.country.getByCurrencyId(orderSet.currencyId),
  ]);
  const components = rawComponents.map(t => {
    return { type: t.type, value: Number(t.value.value) };
  });
  const items = rawItems.map(t => {
    return {
      name: t.name.en,
      type: t.type,
      quantity: t.quantity,
      price: t.price,
      compareAtPrice: undefined,
    };
  });
  await createEInvoice({
    ctx,
    orderType: paymentStatusOrderType.ORDER_SET,
    orderId: orderSet.id,
    orderCreatedAt: orderSet.createdAt,
    orderShortCode: orderSet.shortCode,
    customerId: orderSet.customerId,
    countryId: country.id,
    items,
    components,
  });
};

const createEInvoice = async triggerPayload => {
  // Validation part
  validationEInvoice(triggerPayload);

  // Init
  const {
    ctx,
    orderType,
    orderId,
    orderCreatedAt,
    orderShortCode,
    customerId,
    countryId,
    items,
    components,
  } = triggerPayload;
  try {
    // Get Country
    const { isoCode, currencyId } = await ctx.country.getById(countryId);
    // eslint-disable-next-line no-unused-vars
    const isoCodeUpper = isoCode.toUpperCase();

    // Check Country
    const eInvoiceCountry = eInvoice['TR'];
    if (eInvoiceCountry && eInvoiceCountry.isEnabled) {
      const customer = ctx.customer.getById(customerId);
      const currency = ctx.currency.getById(currencyId);

      const promiseList = [];
      promiseList.push(currency);
      promiseList.push(customer);

      const res = await Promise.all(promiseList);
      if (res) {
        const flatComponents = {};
        components.map(t => {
          flatComponents[t.type] = Number(t.value);
        });
        const totalDiscountWithoutItems = ['DISCOVERY_CREDITS', 'GIFT_CARD', 'VOUCHER', 'REWARD_DISCOUNT', 'REFERRAL']
          .reduce((p, c) => Number(p) + Number(flatComponents[c] || 0), 0);

        const [currency, { firstName, lastName, phoneNumber, email }] = res;

        let itemCount = 1;
        const totalAmount = flatComponents['TOTAL'];
        const invoiceInvoiceLines = items.map(t => calculateLine(eInvoiceCountry, currency, itemCount++, totalAmount, totalDiscountWithoutItems, t));
        if (flatComponents['SERVICE_FEE'] && flatComponents['SERVICE_FEE'] > 0) {
          const calculationRes = calculateItem({
            eInvoiceCountry,
            currency,
            undefined,
            type: 'OTHERS',
            quantity: 1,
            itemPrice: Number(flatComponents['SERVICE_FEE']),
            itemCompareAtPrice: undefined,
          });
          const paramT = { quantity: 1, name: 'SERVIS UCRETI' };
          const line = generateXmlLine(itemCount++, paramT, calculationRes);
          items.push(line);
        }

        const totalDiscount = invoiceInvoiceLines.reduce((p, c) => Number(p) + Number(c ? c.itemAmount || 0 : 0), totalDiscountWithoutItems || 0);
        const totalAmounts = {
          lineExtensionAmount: invoiceInvoiceLines.reduce((p, c) => Number(p) + Number(c ? c.itemPriceAmountViaQuantity || 0 : 0), 0).toFixed(2).toString(),
          taxExclusiveAmount: invoiceInvoiceLines.reduce((p, c) => Number(p) + Number(c ? c.itemTaxableAmount || 0 : 0), 0).toFixed(2).toString(),
          taxInclusiveAmount: flatComponents['TOTAL'].toFixed(2).toString(),
          allowanceTotalAmount: totalDiscount.toFixed(2).toString(),
          chargeTotalAmount: (0).toFixed(2).toString(),
          payableAmount: flatComponents['AMOUNT_PAID'].toFixed(2).toString(),
        };

        const taxTotalList = calculateTaxTotal(invoiceInvoiceLines);

        const payload = {
          orderType,
          order: { id: orderId, createdAt: orderCreatedAt, shortCode: orderShortCode },
          customer: { firstName, lastName, phoneNumber, email },
          invoiceItems: invoiceInvoiceLines,
          invoiceTaxes: taxTotalList,
          invoiceGeneralTotal: totalAmounts,
        };

        await sendPayloadWithHttp(eInvoiceCountry.endpoint, payload);
        ctx.kinesisLogger.sendLogEvent(
          { input: triggerPayload, payload },
          kinesisEventTypes.eInvoiceRequestSuccess,
        );
      }
    }

  } catch (err) {
    ctx.kinesisLogger.sendLogEvent(
      { input: triggerPayload, err },
      kinesisEventTypes.eInvoiceRequestError,
    );
  }
};

module.exports = { createEInvoiceForOrderSet, createEInvoice };
