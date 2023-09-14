/* eslint-disable camelcase */
const BaseModel = require('../../base-model');
const QueryHelper = require('../../lib/query-helper');
const {
  renderConfirmationEmail,
} = require('./../gift-card-order/email-confirmation-renderer');
const { notificationCategories } = require('../../lib/notifications');
const {
  notifications: {
    emailAddresses: { receipts },
  },
  generatedGiftCardCustomer,
} = require('../../../config');
const {
  addLocalizationField,
  transformToCamelCase,
  formatErrorResponse,
  generateShortCode,
  uuid,
} = require('../../lib/util');
const { createLoaders } = require('./loaders');
const { redeemGiftCardError, giftCardStatus } = require('../root/enums');
const { first, includes, map } = require('lodash');
const moment = require('moment');
const { GiftCardCreateBulkError } = require('./enums');
const { statusTypes, giftCardTemplateStatus } = require('../root/enums');

class GiftCard extends BaseModel {
  constructor(db, context) {
    super(db, 'gift_cards', context);
    this.loaders = createLoaders(this);
  }

  filterGiftCards(query, filters) {
    if (filters.status) query.where('gift_cards.status', filters.status);
    if (filters.countryId)
      query.where('gift_cards.country_id', filters.countryId);

    if (filters.searchText) {
      filters.searchText = filters.searchText.toLowerCase().trim();
      query.whereRaw(
        '(LOWER(gift_cards.name) like ? or LOWER(gift_cards.name_ar) like ? or LOWER(gift_cards.name_tr) like ? or  LOWER(gift_cards.code) like ? )'
        , [`%${filters.searchText}%`, `%${filters.searchText}%`, `%${filters.searchText}%`, `%${filters.searchText}%`],
      );
    }
    return query;
  }

  async getByGiftCardOrderId(id) {
    return addLocalizationField(
      addLocalizationField(
        await this.db
          .select(this.db.raw('gift_cards.*'))
          .table('gift_cards')
          .where('gift_cards.gift_card_order_id', id)
          .then(transformToCamelCase)
          .then(first),
        'imageUrl'
      ),
      'name'
    );
  }

  async getByShortCode(shortCode) {
    return addLocalizationField(
      addLocalizationField(
        await this.db
          .select(this.db.raw('gift_cards.*'))
          .table('gift_cards')
          .where('gift_cards.code', shortCode)
          .then(transformToCamelCase)
          .then(first),
        'imageUrl'
      ),
      'name'
    );
  }

  getAll(filters) {
    let query = super
      .getAll()
      .select(this.db.raw('gift_cards.*'))
      .orderBy('gift_cards.created', 'desc');
    if (filters) query = this.filterGiftCards(query, filters);

    return query;
  }
  async getAllPagedForAdmin(paging, filters) {
    const query = this.getAll(filters);
    const rsp = await new QueryHelper(query)
      .addPaging(paging)
      .addCounting()
      .resolvePagedQuery();
    rsp.items = addLocalizationField(
      addLocalizationField(rsp.items, 'imageUrl'),
      'name'
    );
    return rsp;
  }
  async getAllPaged(paging, filters, customerId) {
    const query = this.getAll(filters)
      .where('gift_cards.sender_id', customerId)
      .orWhere('gift_cards.receiver_id', customerId);
    const rsp = await new QueryHelper(query)
      .addPaging(paging)
      .addCounting()
      .resolvePagedQuery();
    rsp.items = addLocalizationField(
      addLocalizationField(rsp.items, 'imageUrl'),
      'name'
    );
    return rsp;
  }
  async redeem(code, customerId) {
    const [giftCard] = await this.db(this.tableName).where({ code });
    if (!customerId) {
      return formatErrorResponse([redeemGiftCardError.INVALID_CUSTOMER]);
    }
    if (!giftCard) {
      return formatErrorResponse([redeemGiftCardError.INVALID_CODE]);
    }
    if (giftCard.status !== giftCardStatus.ACTIVE) {
      return formatErrorResponse([redeemGiftCardError.ALREADY_REDEEMED]);
    }

    await this.db(this.tableName)
      .where({ id: giftCard.id })
      .update({
        status: giftCardStatus.REDEEMED,
        receiverId: customerId,
        redeemedOn: moment.utc().format(),
      });

    await this.context.giftCardTemplate.incrementRedeemed(
      giftCard.giftCardTemplateId,
      1
    );

    // fake user created to be used with generated gift cards
    if (giftCard.senderId !== '26d1f34e-ec9f-46a5-a26b-81dc34426f1e') {
      await this.sendRedeemNotifications(giftCard);
    }

    return {
      redeemed: true,
    };
  }
  async sendRedeemNotifications(giftCard) {
    const notifications = await this.redeemNotifications(giftCard);
    // console.log('notifications', notifications);
    return this.context.notification.createAllIn(notifications);
  }
  async redeemNotifications(giftCard) {
    const renderRedeemedEmail = await renderConfirmationEmail(
      this.context,
      giftCard.giftCardOrderId,
      '{"redeemed": true}',
      // render email for redeemed
      'redeemed'
    );
    const emailArgs = Object.assign(
      {
        sender: receipts,
        notificationCategory: notificationCategories.GIFT_CARD_ORDER,
      },
      renderRedeemedEmail
    );
    const result = {
      push: [],
      email: [emailArgs],
    };
    return Promise.resolve(result);
  }

  async getCustomerAvailableGiftCards({ customerId, brandId, currencyId }) {
    if (!customerId || !currencyId) return null;
    let query = super
      .getAll()
      .where({
        status: giftCardStatus.REDEEMED,
      })
      .andWhere('receiver_id', customerId)
      .andWhere('currency_id', currencyId)
      .andWhereRaw('amount > 0');
    if (brandId) {
      query = query.andWhereRaw(
        `(brand_id IS NULL or brand_id = '${brandId}')`
      );
    } else {
      query = query.whereNull('brand_id');
    }
    return query;
  }
  async recalculateAmount(giftCardId) {
    const amount = await this.context.giftCardTransaction.getGiftCardBalance(
      giftCardId
    );

    return this.db(this.tableName)
      .where({ id: giftCardId })
      .update({ amount });
  }

  async generateGiftCard(input) {
    input.customer_id = generatedGiftCardCustomer;
    const template = await this.db('gift_card_templates')
      .where('id', input.giftCardTemplateId)
      .first();
    const shortCodes = [];
    while (shortCodes.length < input.noOfCards) {
      const sc = generateShortCode(6);
      if (!includes(shortCodes, sc)) {
        shortCodes.push(sc);
      }
    }
    // return shortCodes;

    await Promise.all(
      map(shortCodes, async shortCode => {
        const giftCardOrderId = uuid.get();
        await this.db('gift_card_orders').insert({
          id: giftCardOrderId,
          short_code: shortCode,
          amount: input.amount,
          currency_id: template.currency_id,
          country_id: template.country_id,
          payment_method: 'N/A',
          gift_card_template_id: template.id,
          customer_id: input.customer_id,
          delivery_method: 'SHARE_MESSAGE',
          receiver_email: null,
          receiver_phone_number: null,
          anonymous_sender: true,
        });

        const giftCardId = uuid.get();
        // console.log('giftCardId', giftCardId);
        await this.db('gift_cards').insert({
          id: giftCardId,
          gift_card_order_id: giftCardOrderId,
          image_url: template.image_url,
          image_url_ar: template.image_url_ar,
          image_url_tr: template.image_url_tr,
          code: shortCode,
          initial_amount: input.amount,
          amount: input.amount,
          country_id: template.country_id,
          currency_id: template.currency_id,
          gift_card_template_id: template.id,
          sender_id: input.customer_id,
          name: template.name,
          name_ar: template.name_ar,
          name_tr: template.name_tr,
          anonymous_sender: true,
          receiver_id: null,
          redeemed_on: null,
          status: 'ACTIVE',
          // brand_id: null,
        });

        // console.log('id', uuid.get());
        // console.log('reference_order_id', uuid.get());
        await this.db('gift_card_transactions').insert({
          id: uuid.get(),
          gift_card_id: giftCardId,
          order_type: 'SCRIPT_GENERATION',
          credit: input.amount,
          debit: 0,
          currency_id: template.currency_id,
          customer_id: input.customer_id,
          reference_order_id: uuid.get(),
        });
      })
    );
    return shortCodes;
  }

  async getGiftCardByOrderId(giftCardOrderId) {
    return await this.db(this.tableName).where({giftCardOrderId}).first();
  }

  async updateGiftCardStatusByGiftCardOrderId(giftCardOrderId, status) {
    await this.db(this.tableName)
      .where({ giftCardOrderId })
      .update({
        status,
      });
  }

  async validateCreateBulk({countryId, giftCardTemplateId, noOfCards, amount}) {
    const errors = [];
    if (noOfCards <= 0) {
      errors.push(GiftCardCreateBulkError.INVALID_NO_OF_CARDS);
      return errors;
    }
    if (!countryId) {
      errors.push(GiftCardCreateBulkError.INVALID_COUNTRY);
    } else {
      const country = await this.context.country.getById(countryId);
      if (!country || country.status != statusTypes.ACTIVE) {
        errors.push(GiftCardCreateBulkError.INVALID_COUNTRY);
      }
    }
    if (!giftCardTemplateId) {
      errors.push(GiftCardCreateBulkError.INVALID_TEMPLATE);
    } else {
      const giftCardTemplate = await this.context.giftCardTemplate.getById(giftCardTemplateId);
      if (giftCardTemplate.status != giftCardTemplateStatus.ACTIVE) {
        errors.push(GiftCardCreateBulkError.INVALID_TEMPLATE);
      }
      if (giftCardTemplate && countryId != giftCardTemplate.countryId) {
        errors.push(GiftCardCreateBulkError.UNMATCHED_COUNTRY);
      }
      if (giftCardTemplate.minLimit && giftCardTemplate.minLimit > amount) {
        errors.push(GiftCardCreateBulkError.MIN_LIMIT_EXCEEDED);
      }
      if (giftCardTemplate.maxLimit && giftCardTemplate.maxLimit < amount) {
        errors.push(GiftCardCreateBulkError.MAX_LIMIT_EXCEEDED);
      }
    }
    return errors;
  }

  async getByShortCodes(shortCodes) {
    const codes = await this.roDb(this.tableName)
      .select('code')
      .whereIn('code', shortCodes);
    const duplicateCodes = codes.map((elem) => elem.code);
    return duplicateCodes;
  }

  async createUniqueShortCodes(existingCodes, noOfCards) {
    if (!noOfCards) {
      return [];
    }
    let shortCodes = [];
    while ((shortCodes.length + existingCodes.length) < noOfCards) {
      const sc = generateShortCode(6);
      if (!includes(shortCodes, sc) && !includes(existingCodes, sc)) {
        shortCodes.push(sc);
      }
    }
    const duplicateCodes = await this.getByShortCodes(shortCodes);
    shortCodes = shortCodes.filter(x => !includes(duplicateCodes, x));
    return shortCodes;
  }

  async generateUniqueShortCodes(noOfCards) {
    let codes = [];
    while (codes.length < noOfCards) {
      codes = [...await this.createUniqueShortCodes(codes, noOfCards)];
    }
    return codes;
  }

  async createBulk({ giftCardTemplateId, noOfCards, amount}) {
    const customerId = generatedGiftCardCustomer;
    const template = await this.db('gift_card_templates')
      .where('id', giftCardTemplateId)
      .first();

    const shortCodes = await this.generateUniqueShortCodes(noOfCards);

    await Promise.all(
      map(shortCodes, async shortCode => {
        const giftCardOrderId = uuid.get();
        await this.db.raw(`INSERT INTO gift_card_orders (id,short_code,amount,currency_id,country_id,payment_method,gift_card_template_id,customer_id,
          delivery_method,receiver_email,receiver_phone_number,anonymous_sender,created,updated,receipt_url,error_url,
          payment_provider,merchant_id,receiver_name,message) VALUES ('${giftCardOrderId}','${shortCode}','${amount}','${template.currencyId}','${template.countryId}', 'N/A' ,'${giftCardTemplateId}','${customerId}','SHARE_MESSAGE',null, null, true,NOW(),NOW(),'cofedistrict://receipt','cofedistrict://error',null,null,null,'');`);
        const giftCardId = uuid.get();
        await this.db('gift_cards').insert({
          id: giftCardId,
          gift_card_order_id: giftCardOrderId,
          image_url: template.imageUrl,
          image_url_ar: template.imageUrlAr,
          image_url_tr: template.imageUrlTr,
          code: shortCode,
          initial_amount: amount,
          amount,
          country_id: template.countryId,
          currency_id: template.currencyId,
          gift_card_template_id: template.id,
          sender_id: customerId,
          name: template.name,
          name_ar: template.nameAr,
          name_tr: template.nameTr,
          anonymous_sender: true,
          receiver_id: null,
          redeemed_on: null,
          status: 'ACTIVE',
          // brand_id: null,
        });
        await this.db('gift_card_transactions').insert({
          id: uuid.get(),
          gift_card_id: giftCardId,
          order_type: 'SCRIPT_GENERATION',
          credit: amount,
          debit: 0,
          currency_id: template.currencyId,
          customer_id: customerId,
          reference_order_id: uuid.get(),
        });
      })
    );
    return shortCodes;
  }

}


module.exports = GiftCard;
