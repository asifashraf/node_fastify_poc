const { get } = require('lodash');
const BaseModel = require('../../base-model');

class GiftCardTransaction extends BaseModel {
  constructor(db, context) {
    super(db, 'gift_card_transactions', context);
  }

  async getByOrderId(id) {
    const transacation = await this.db(this.tableName).where(
      'reference_order_id',
      id
    );
    return transacation;
  }

  async credit({
    giftCardId,
    referenceOrderId,
    orderType,
    customerId,
    amount,
    currencyId,
  }) {
    await this.save({
      giftCardId,
      referenceOrderId,
      orderType,
      credit: amount,
      customerId,
      currencyId,
    });
    return this.context.giftCard.recalculateAmount(giftCardId);
  }

  async debit({
    giftCardId,
    referenceOrderId,
    orderType,
    customerId,
    amount,
    currencyId,
  }) {
    await this.save({
      giftCardId,
      referenceOrderId,
      orderType,
      debit: amount,
      customerId,
      currencyId,
    });
    return this.context.giftCard.recalculateAmount(giftCardId);
  }

  async debitedForOrderId(id) {
    const query = `
    SELECT sum(debit) as balance
    FROM gift_card_transactions
    WHERE reference_order_id = :id`;

    const results = await this.db
      .raw(query, { id })
      .then(result => result.rows);

    return get(results, '[0].balance', 0);
  }

  async creditedForOrderId(id) {
    const query = `
    SELECT sum(credit) as balance
    FROM gift_card_transactions
    WHERE reference_order_id = :id`;

    const results = await this.db
      .raw(query, { id })
      .then(result => result.rows);

    return get(results, '[0].balance', 0);
  }

  async getGiftCardBalance(giftCardId) {
    const query = `
    SELECT coalesce((sum(credit) - sum(debit)),0) as balance
    FROM gift_card_transactions
    WHERE gift_card_id = :giftCardId`;

    const results = await this.db
      .raw(query, { giftCardId })
      .then(result => result.rows);

    return get(results, '[0].balance', 0);
  }
}

module.exports = GiftCardTransaction;
