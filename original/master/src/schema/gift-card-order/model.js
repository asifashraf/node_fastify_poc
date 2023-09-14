const BaseModel = require('../../base-model');
const QueryHelper = require('../../lib/query-helper');
const { getGiftCardUrl } = require('../../lib/url-shortener');
const { createLoaders } = require('./loaders');
const {
  paymentStatusOrderType,
  paymentStatusName,
  giftCardStatus,
  giftCardOrderCreateError,
  giftCardTransactionOrderType,
  transactionAction,
  transactionType,
  orderPaymentMethods,
  giftCardDeliveryMethod,
  inactiveGiftCardError
} = require('../../../src/schema/root/enums');
const {
  contentTemplates,
  replacePlaceholders,
} = require('../../lib/push-notification');
const { toNumber, pick, omit } = require('lodash');
const {
  addLocalizationField,
  addIconsToPaymentMethods,
  formatError,
  formatErrorResponse,
  generateShortCode,
  cloneObject,
} = require('../../lib/util');
const { renderConfirmationEmail } = require('./email-confirmation-renderer');
const {
  notifications: {
    emailAddresses: { receipts },
  },
  order: orderConfig,
} = require('../../../config');
const { notificationCategories } = require('../../lib/notifications');
const {
  kinesisEventTypes: { giftCardOrderCreateFail, giftCardOrderCreateSuccess },
} = require('../../lib/aws-kinesis-logging');

const SlackWebHookManager = require('../slack-webhook-manager/slack-webhook-manager');
const GiftCardOrderReportFormatter = require('./gift-card-order-report-formatter');

class GiftCardOrder extends BaseModel {
  constructor(db, context) {
    super(db, 'gift_card_orders', context);
    this.loaders = createLoaders(this);
  }

  getByShortCode(shortCode) {
    return this.db(this.tableName).where('short_code', shortCode.toUpperCase());
  }

  async create(input) {
    await this.checkForCreditLock(input);
    const giftCardTemplate = await this.context.giftCardTemplate.getById(
      input.giftCardTemplateId
    );
    if (giftCardTemplate) {
      input.maxLimit = giftCardTemplate.maxLimit;
      input.minLimit = giftCardTemplate.minLimit;
      input.currencyId = giftCardTemplate.currencyId;
      input.countryId = giftCardTemplate.countryId;
    }
    // Validate Order
    const validationErrors = await this.validate(input);

    if (validationErrors.length > 0) {
      return formatErrorResponse(validationErrors);
    }

    // Start off by creating a Gift Card Order
    const giftCardOrder = pick(input, [
      'customerId',
      'currencyId',
      'countryId',
      'amount',
      'giftCardTemplateId',
      'deliveryMethod',
      'receiverName',
      'receiverEmail',
      'receiverPhoneNumber',
      'anonymousSender',
      'message',
    ]);

    giftCardOrder.receiverEmail = giftCardOrder.receiverEmail.toLowerCase();
    const getUniqueShortCode = async () => {
      const shortCode = generateShortCode();
      const [order] = await this.getByShortCode(shortCode);
      if (!order) {
        return shortCode;
      }
      return getUniqueShortCode();
    };

    giftCardOrder.shortCode = await getUniqueShortCode();

    const customer = await this.context.customer.getById(
      giftCardOrder.customerId
    );
    const currency = await this.context.currency.getById(
      giftCardOrder.currencyId
    );
    const country = await this.context.country.getById(giftCardOrder.countryId);

    let customerCardTokenSnapshot = null;
    const {
      paymentProvider,
      customerCardToken,
    } = await this.context.paymentService.detectPaymentProviderViaPaymentMethod(
      input.paymentMethod
    );
    if (customerCardToken) {
      customerCardTokenSnapshot = cloneObject(customerCardToken);
      delete customerCardTokenSnapshot.providerRaw;
    }

    giftCardOrder.paymentProvider = paymentProvider;
    giftCardOrder.paymentMethod = input.paymentMethod
      ? input.paymentMethod.paymentScheme
      : null;
    giftCardOrder.receiptUrl = orderConfig.receiptUrl;
    giftCardOrder.errorUrl = orderConfig.errorUrl;

    // Create the Order
    const giftCardOrderId = await this.save(giftCardOrder);
    const amount = toNumber(giftCardOrder.amount);

    let paymentStatus = paymentStatusName.PAYMENT_PENDING;
    let paymentRawResponse = {};
    let paymentUrl = null;

    // Save Order payment method
    const orderPaymentMethodInput = {
      orderType: paymentStatusOrderType.GIFT_CARD_ORDER,
      referenceOrderId: giftCardOrderId,
      paymentProvider,
      paymentMethod: input.paymentMethod || null,
      customerCardTokenSnapshot,
    };
    await this.context.orderPaymentMethod.save(orderPaymentMethodInput);

    if (amount > 0) {
      if (paymentProvider && input.paymentMethod) {
        const psResponse = await this.context.paymentService.pay({
          language: customer.preferedLanguage,
          currencyCode: currency.isoCode,
          countryCode: country.isoCode,
          countryId: country.id,
          amount,
          paymentMethod: input.paymentMethod,
          referenceOrderId: giftCardOrderId,
          orderType: paymentStatusOrderType.GIFT_CARD_ORDER,
          customerId: customer.id,
          customerPhoneNumber: customer.phoneNumber,
        });
        if (psResponse.error) {
          paymentStatus = paymentStatusName.PAYMENT_FAILURE;

          await this.context.paymentStatus.save({
            referenceOrderId: giftCardOrderId,
            orderType: paymentStatusOrderType.GIFT_CARD_ORDER,
            name: paymentStatus,
            rawResponse: psResponse.error,
          });

          await this.context.kinesisLogger.sendLogEvent(
            {
              customer,
              currencyIso: currency.isoCode,
              countryIso: country.isoCode,
              rawGiftCardCreateInput: input,
              giftCardPaymentStatus: paymentStatus,
              giftCardPaymentResponse: psResponse,
              giftCardOrder,
            },
            giftCardOrderCreateFail
          );

          return {
            error: [giftCardOrderCreateError.MERCHANT_INITIALIZATION_ERROR],
          };
        }
        await this.save({
          id: giftCardOrderId,
          merchantId: psResponse.id,
        });
        paymentUrl = psResponse.paymentUrl;
        paymentRawResponse = psResponse.rawResponse;
        if (psResponse.approved) {
          paymentStatus = paymentStatusName.PAYMENT_SUCCESS;
        }
      }
    } else {
      paymentStatus = paymentStatusName.PAYMENT_SUCCESS;
      paymentRawResponse = '{"amount": 0}';
    }

    if (paymentStatus === paymentStatusName.PAYMENT_SUCCESS) {
      await this.createGiftCardAfterPaymentOkay({
        ...giftCardOrder,
        id: giftCardOrderId,
      });
    }

    // Insert Initial Payment Status
    await this.context.paymentStatus.save({
      referenceOrderId: giftCardOrderId,
      orderType: paymentStatusOrderType.GIFT_CARD_ORDER,
      name: paymentStatus,
      rawResponse: paymentRawResponse,
    });

    await this.context.kinesisLogger.sendLogEvent(
      {
        customer,
        currencyIso: currency.isoCode,
        countryIso: country.isoCode,
        rawGiftCardCreateInput: input,
        giftCardPaymentStatus: paymentStatus,
        giftCardPaymentRawResponse: paymentRawResponse,
        giftCardOrder,
      },
      giftCardOrderCreateSuccess
    );

    return {
      paymentUrl,
      giftCardOrderId,
      paymentStatus,
    };
  }

  async validate(input) {
    const errors = [];
    if (input.minLimit > input.amount && input.minLimit !== 0)
      errors.push(giftCardOrderCreateError.MIN_LIMIT_EXCEEDED);
    if (input.maxLimit < input.amount && input.maxLimit !== 0)
      errors.push(giftCardOrderCreateError.MAX_LIMIT_EXCEEDED);

    if (input.useCredits) {
      // Validate that the customer has enough credit
      const customerBalance = await this.context.loyaltyTransaction.getBalanceByCustomer(
        input.customerId,
        input.currencyId
      );

      if (Number(customerBalance) < Number(input.amount)) {
        errors.push(giftCardOrderCreateError.INSUFFICIENT_CREDITS);
      }
    } else if (!input.paymentMethod) {
      errors.push(giftCardOrderCreateError.PAYMENT_METHOD_REQUIRED);
    }

    return errors;
  }

  async validateForInactive(id) {
    const errors = [];
    const giftCard = await this.context.giftCard.getGiftCardByOrderId(id);
    if (giftCard) {
      if (giftCard.status === giftCardStatus.REVOKE || giftCard.status === giftCardStatus.INACTIVE ||
        (giftCard.status === giftCardStatus.REDEEMED && giftCard.initialAmount !== giftCard.amount)) {
        errors.push(inactiveGiftCardError.STATUS_MUST_BE_ACTIVE);
      }
    } else {
      errors.push(inactiveGiftCardError.INVALID_GIFT_CARD);
    }
    return errors;
  }

  checkForCreditLock({ useCredits }) {
    if (useCredits) {
      return this.db.raw(
        'LOCK TABLE loyalty_transactions IN ACCESS EXCLUSIVE MODE'
      );
    }
    return null;
  }

  filterGiftCardOrder(query, filters) {
    if (filters.searchText) {
      filters.searchText = filters.searchText.toLowerCase().trim();
      query.whereRaw(
        '(LOWER(gift_card_orders.short_code) like ? or gift_card_orders.receiver_email like ? or gift_card_orders.receiver_phone_number like ? )'
        , [`%${filters.searchText}%`, `%${filters.searchText}%`, `%${filters.searchText}%`],
      );
    }

    query.join(
      'gift_card_templates',
      'gift_card_templates.id',
      'gift_card_orders.gift_card_template_id'
    );

    if (filters.collectionId)
      query.where(
        'gift_card_templates.gift_card_collection_id',
        filters.collectionId
      );

    if (filters.brandId)
      query.where('gift_card_templates.brand_id', filters.brandId);

    if (filters.countryId) {
      query.where('gift_card_orders.country_id', filters.countryId);
    }

    if (filters.currencyId) {
      query.where('gift_card_orders.currency_id', filters.currencyId);
    }

    return query;
  }
  getAll(filters) {
    let query = super
      .getAll()
      .select(this.db.raw('gift_card_orders.*'))
      .orderBy('gift_card_orders.created', 'desc');
    if (filters) {
      query = this.filterGiftCardOrder(query, filters);
    }
    return query;
  }

  async getAllPaged(paging, filters) {
    const query = this.getAll(filters);
    const rsp = await new QueryHelper(query)
      .addPaging(paging)
      .addCounting()
      .resolvePagedQuery();
    return rsp;
  }

  async checkIfGiftCardOrderBelongsToUser(customerId, giftCardOrderId) {
    const giftCardOrder = await this.db(this.tableName)
      .where('id', giftCardOrderId)
      .andWhere('customer_id', customerId).first();
    return (giftCardOrder !== undefined && giftCardOrder !== null);
  }

  /**
   Sends customer notifications indicated by the payment status change.
   */
  async sendPaymentStatusChangeNotifications(
    giftCardOrderId,
    paymentStatusName,
    knetResponse
  ) {
    const notifications = await this.paymentStatusChangeNotifications(
      giftCardOrderId,
      paymentStatusName,
      knetResponse,
      this.context
    );
    // console.log('notifications', notifications);
    return this.context.notification.createAllIn(notifications);
  }

  async paymentStatusChangeNotifications(
    giftCardOrderId,
    paymentStatusName,
    knetResponse,
    context
  ) {
    const emptySet = { push: [], email: [] };
    const skipNotifications = false;

    if (skipNotifications) return Promise.resolve(emptySet);

    if (paymentStatusName !== 'PAYMENT_SUCCESS') {
      return Promise.resolve(emptySet);
    }

    const emails = [];
    let renderReceiptEmail = await renderConfirmationEmail(
      context,
      giftCardOrderId,
      knetResponse,
      // render email for receipt
      'receipt'
    );

    const { giftCardOrder } = renderReceiptEmail;

    renderReceiptEmail = omit(renderReceiptEmail, ['giftCardOrder']);

    emails.push(
      Object.assign(
        {
          sender: receipts,
          notificationCategory: notificationCategories.GIFT_CARD_ORDER,
        },
        renderReceiptEmail
      )
    );
    if (giftCardOrder.deliveryMethod === giftCardDeliveryMethod.EMAIL) {
      let renderReceiverEmail = await renderConfirmationEmail(
        context,
        giftCardOrderId,
        knetResponse,
        // render email for receiver
        'receiver'
      );
      renderReceiverEmail = omit(renderReceiverEmail, ['giftCardOrder']);
      emails.push(
        Object.assign(
          {
            sender: receipts,
            notificationCategory: notificationCategories.GIFT_CARD_ORDER,
          },
          renderReceiverEmail
        )
      );
    }
    const pushes = [];
    // check if receiver is customer
    const receiverAsCustomer = await context.customer.getByEmail(
      giftCardOrder.receiverEmail
    );
    if (receiverAsCustomer) {
      const senderName = giftCardOrder.anonymousSender
        ? 'Anonymous user'
        : (
          giftCardOrder.customer.firstName +
            ' ' +
            giftCardOrder.customer.lastName
        ).trim();
      const heading = contentTemplates().headings.giftCardOrderCreate;
      // const url = giftCardOrder.giftCard.shareUrl;
      const url = `https://cofeapp.com/applinks/giftcard/redeem/?code=${giftCardOrder.shortCode}`;
      const message = replacePlaceholders(
        contentTemplates().contents.giftCardOrderCreate,
        {
          // eslint-disable-next-line camelcase
          sender_name: senderName,
        }
      );
      pushes.push({
        customerId: receiverAsCustomer.id,
        message,
        heading,
        url,
        notificationCategory: notificationCategories.GIFT_CARD_ORDER,
      });
    }
    const result = {
      push: pushes,
      email: emails,
    };

    return Promise.resolve(result);
  }

  async getAvailablePaymentMethods({
    total: amount,
    currencyCode,
    countryCode,
  }) {
    const currency = await this.context.currency.getByCode(currencyCode);
    let paymentMethods = [
      {
        id: orderPaymentMethods.CREDITS,
        name: 'COFE Credits',
        nameAr: 'رصيد كوفي',
        nameTr: 'COFE Kredileri',
        serviceCharge: 0,
        totalAmount: amount,
        directPayment: false,
        currency: addLocalizationField(
          addLocalizationField(currency, 'code'),
          'subunitName'
        ),
      },
    ];

    const customerId =
      this.context.auth && this.context.auth.id ? this.context.auth.id : null;

    const providerPaymentMethods = await this.context.paymentService.getPaymentMethods(
      {
        countryCode,
        currencyCode,
        customerId,
        amount,
      }
    );

    providerPaymentMethods.map(providerPaymentMethod => {
      paymentMethods.push({
        ...providerPaymentMethod,
        currency: addLocalizationField(
          addLocalizationField(currency, 'symbol'),
          'subunitName'
        ),
      });
      return providerPaymentMethod;
    });

    paymentMethods = addIconsToPaymentMethods(paymentMethods);
    return addLocalizationField(paymentMethods, 'name');
  }

  async resolvePaymentCallback(psResponse) {
    const { referenceOrderId, paymentStatus, rawResponse } = psResponse;
    const giftCardOrder = await this.getById(referenceOrderId);
    if (!giftCardOrder) {
      return formatError([`gift card order ${referenceOrderId} not found`]);
    }
    const paymentStatuses = await this.context.paymentStatus.getAllByGiftCardOrderId(
      giftCardOrder.id
    );
    const newPaymentStatus = {
      referenceOrderId,
      orderType: paymentStatusOrderType.GIFT_CARD_ORDER,
      name: paymentStatus,
      rawResponse: JSON.stringify(rawResponse),
    };
    if (paymentStatus === paymentStatusName.PAYMENT_SUCCESS) {
      if (paymentStatuses.find(p => p.name === paymentStatusName.PAYMENT_SUCCESS)) {
        console.log(
          `${paymentStatusName.PAYMENT_SUCCESS} already processed for ${giftCardOrder.id}`
        );
      } else {
        // credit only on first time success
        await this.createGiftCardAfterPaymentOkay(giftCardOrder);
        await this.context.paymentStatus.save(newPaymentStatus);
      }
    } else {
      await this.context.paymentStatus.save(newPaymentStatus);
    }
    return {
      redirect:
        paymentStatus === paymentStatusName.PAYMENT_SUCCESS
          ? giftCardOrder.receiptUrl
          : giftCardOrder.errorUrl,
      trackid: giftCardOrder.id,
      paymentMethod: giftCardOrder.paymentMethod,
    };
  }

  async createGiftCardAfterPaymentOkay(giftCardOrder) {
    const giftCardTemplate = await this.context.giftCardTemplate.getById(
      giftCardOrder.giftCardTemplateId
    );
    await this.context.giftCardTemplate.incrementPurchased(
      giftCardTemplate.id,
      1
    );
    const customer = await this.context.customer.getById(
      giftCardOrder.customerId
    );
    const currency = await this.context.currency.getById(
      giftCardTemplate.currencyId
    );
    const amount = toNumber(giftCardOrder.amount);
    let shareUrl = null;
    try {
      const giftCardUrl = await getGiftCardUrl(
        giftCardOrder.shortCode,
        customer.firstName,
        giftCardTemplate.imageUrl,
        amount,
        currency.isoCode,
        giftCardOrder.message
      );
      if (!giftCardUrl.shortLink) {
        const err = new Error('Can not generate shortLink.');
        err.object = giftCardUrl;
        throw err;
      }
      shareUrl = giftCardUrl.shortLink;
    } catch (error) {
      await SlackWebHookManager.sendTextAndErrorToSlack('Generating Gift Card URL process failed!.', error);
      return false;
    }
    const giftCard = {
      giftCardOrderId: giftCardOrder.id,
      imageUrl: giftCardTemplate.imageUrl,
      imageUrlAr: giftCardTemplate.imageUrlAr,
      imageUrlTr: giftCardTemplate.imageUrlTr,
      code: giftCardOrder.shortCode,
      initialAmount: amount,
      amount,
      giftCardTemplateId: giftCardTemplate.id,
      senderId: giftCardOrder.customerId,
      anonymousSender: false,
      // receiver: null,
      // redeemedOn: null,
      status: giftCardStatus.ACTIVE,
      brandId: giftCardTemplate.brandId,
      countryId: giftCardTemplate.countryId,
      currencyId: giftCardTemplate.currencyId,
      name: giftCardTemplate.name,
      nameAr: giftCardTemplate.nameAr,
      nameTr: giftCardTemplate.nameTr,
      message: giftCardOrder.message,
      shareUrl
    };
    let giftCardId = null;
    try {
      giftCardId = await this.context.giftCard.save(giftCard);
    } catch (e) {
      if (e.code === '23000' || e.code === '23505') {
        // This gift card is created, we need to move on with true response
        return true;
      }
      return false;
    }
    await this.context.giftCardTransaction.credit({
      giftCardId,
      referenceOrderId: giftCardOrder.id,
      orderType: giftCardTransactionOrderType.GIFT_CARD_ORDER,
      customerId: giftCardOrder.customerId,
      amount,
      currencyId: giftCardOrder.currencyId,
    });
    await this.context.transaction.add({
      referenceOrderId: giftCardOrder.id,
      orderType: paymentStatusOrderType.GIFT_CARD_ORDER,
      action: transactionAction.GIFT_CARD,
      type: transactionType.CREDITED,
      customerId: giftCardOrder.customerId,
      amount,
      currencyId: giftCardOrder.currencyId,
    });
    return true;
  }

  async getAllExportToCSV(stream, filters) {
    const searchText = (filters.searchTerm || '').trim().toLowerCase();

    const query = this.roDb(this.tableName)
      .select(
        'gift_card_orders.short_code as shortCode',
        'gift_card_orders.amount as amount',
        'gift_card_orders.payment_method as paymentMethod',
        'currencies.name as currencyName',
        'gift_card_templates.name as templateName',
        'gift_card_collections.name as collectionName',
        'customers.first_name as firstName',
        'customers.last_name as lastName',
        'gift_card_orders.delivery_method as deliveryMethod',
        'gift_card_orders.receiver_email as receiverEmail',
        'gift_card_orders.receiver_phone_number as receiverPhoneNumber',
        'gift_card_orders.anonymous_sender as anonymousSender',
        'gift_card_orders.created as created'
      )
      .orderBy('gift_card_orders.created', 'desc');

    if (searchText) {
      query.whereRaw(
        `(LOWER(gift_card_orders.short_code) like '%${filters.searchText}%' or gift_card_orders.receiver_email like '%${filters.searchText}%' or gift_card_orders.receiver_phone_number like '%${filters.searchText}%' )`
      );
    }

    query.join(
      'gift_card_templates',
      'gift_card_templates.id',
      'gift_card_orders.gift_card_template_id'
    );
    query.join(
      'gift_card_collections',
      'gift_card_collections.id',
      'gift_card_templates.gift_card_collection_id'
    );

    query.join('currencies', 'currencies.id', 'gift_card_orders.currency_id');
    query.join('customers', 'customers.id', 'gift_card_orders.customer_id');

    if (filters.collectionId) {
      query.where(
        'gift_card_templates.gift_card_collection_id',
        filters.collectionId
      );
    }
    if (filters.brandId) {
      query.where('gift_card_templates.brand_id', filters.brandId);
    }

    if (filters.countryId) {
      query.where('gift_card_orders.country_id', filters.countryId);
    }

    if (filters.currencyId) {
      query.where('gift_card_orders.currency_id', filters.currencyId);
    }

    return query
      .stream(s => s.pipe(new GiftCardOrderReportFormatter()).pipe(stream))
      .catch(console.error);
  }
}

module.exports = GiftCardOrder;
