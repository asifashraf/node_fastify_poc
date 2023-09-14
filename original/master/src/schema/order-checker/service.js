const Axios = require('axios');
const SlackWebHookManager = require(
  '../slack-webhook-manager/slack-webhook-manager'
);
const { paymentSchemes } = require('../../payment-service/enums');
const { paymentProviders } = require('../../payment-service/enums');
const { paymentStatusOrderType } = require('../root/enums');
const { orderCheckerService } = require('../../../config');

class OrderCheckerService {
  constructor(context) {
    this.context = context;
    this.axios = Axios.create({
      baseURL: orderCheckerService.url,
      timeout: 10000,
    });
  }

  getPaymentId({ paymentProvider, paymentProviderResponse }) {
    if (!paymentProviderResponse) return null;
    switch (paymentProvider) {
      case paymentProviders.MY_FATOORAH:
        return paymentProviderResponse.Data.InvoiceId;
      case paymentProviders.CHECKOUT:
        return paymentProviderResponse.id;
      case paymentProviders.TAP:
        return paymentProviderResponse.id;
      default:
        return null;
    }
  }

  validateOrderCheckerEvent({
    referenceOrderId, orderType, paymentId, paymentProvider,
    countryIso, paymentMethod
  }) {
    // filtered these types to avoid extra cost.
    // when other order types and payment providers
    // are added in lambda we can remove these filters
    if (orderType !== paymentStatusOrderType.ORDER_SET) {
      return false;
    }
    if (
      paymentProvider !== paymentProviders.CHECKOUT
      && paymentProvider !== paymentProviders.MY_FATOORAH
      && paymentProvider !== paymentProviders.TAP
    ) return false;
    // MyFatoorah ApplePay payments are occurring on mobile side
    // because there is no paymentId here, we can't check order
    if (
      paymentProvider === paymentProviders.MY_FATOORAH
      && paymentMethod === paymentSchemes.APPLE_PAY
    ) return false;
    if (!paymentId || !referenceOrderId || !countryIso) {
      throw Error('order checker validation error. missing parameters');
    }
    return true;
  }

  /**
   * Create order check event after specified time with lambda
   * @param {uuid} orderCheckerEvent.referenceOrderId
   * @param {
   *    ("ORDER_SET"|"STORE_ORDER_SET"|"GIFT_CARD_ORDER"|"LOYALTY_ORDER")
   *  } orderCheckerEvent.orderType
   * @param {any} orderCheckerEvent.paymentProviderResponse
   * @param {string} orderCheckerEvent.paymentProvider - like CHECKOUT
   * @param {string} orderCheckerEvent.paymentMethod - like APPLE_PAY
   * @param {string} orderCheckerEvent.countryIso - like TR
   * @returns {Promise<boolean>}
   */
  async checkOrderAfterWait(orderCheckerEvent) {
    try {
      const paymentId = this.getPaymentId(orderCheckerEvent);
      if (
        this.validateOrderCheckerEvent({
          ...orderCheckerEvent,
          paymentId,
        })
      ) {
        await this.axios.post(
          '/check',
          {
            ...orderCheckerEvent,
            paymentId,
            waitseconds: orderCheckerService.waitInSeconds,
          },
        );
        return true;
      }
    } catch (err) {
      SlackWebHookManager.sendTextToSlack(`
          OrderChecker event creation failed!
          parameters -> ${JSON.stringify(orderCheckerEvent)}
          err -> ${JSON.stringify(err)}
          place -> src/schema/order-checker/service.js:48
        `).catch(err => console.log({
        place: 'src/schema/order-checker/service.js:48',
        err: JSON.stringify(err),
      }));
    }
    return false;
  }
}

module.exports = OrderCheckerService;
