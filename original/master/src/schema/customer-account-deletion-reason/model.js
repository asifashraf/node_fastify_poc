const BaseModel = require('../../base-model');
const { saveError } = require('./enums');

class CustomerAccountDeletionReason extends BaseModel {
  constructor(db, context) {
    super(db, 'customer_account_deletion_reason', context);
  }

  async save(options) {
    const currentList = await this.getAll();
    // find creates and updates
    const input = options.map(option => {
      option.reason = option.reasonTranslations;
      delete option.reasonTranslations;
      const oldRecord =
        currentList.find(({ id }) => id === option.id) || {};
      return { ...oldRecord, ...option };
    });
    // find deletes
    currentList.forEach(oldRecord => {
      if (!input.find(({ id }) => oldRecord.id === id)) {
        input.push({ ...oldRecord, isDeleted: true });
      }
    });
    await super.save(input);

    const updatedList = await this.getAll();
    return {
      customerAccountDeletionReasonOptions: updatedList
    };
  }

  validate(options) {
    const errors = [];

    for (const { order } of options) {
      const { length } = options.filter(option => option.order === order);
      if (length > 1) {
        errors.push(saveError.DUPLICATE_ORDER);
        break;
      }
    }

    return errors;
  }

  getAll() {
    return this.db(this.tableName)
      .where('is_deleted', false)
      .orderBy('order', 'asc');
  }
}

module.exports = CustomerAccountDeletionReason;
