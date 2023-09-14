const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const {
  adminSubscriptionError
} = require('../root/enums');

class AdminBranchSubscription extends BaseModel {
  constructor(db, context) {
    super(db, 'admin_branch_subscription', context);
    this.loaders = createLoaders(this);
  }

  async validate(branchId) {
    const errors = [];

    const branch = await this.context.brandLocation.getById(branchId);
    if (!branch) {
      errors.push(adminSubscriptionError.INVALID_BRANCH);
    }

    return errors;
  }

  async getPreviousSubscriptionId({ adminId, branchId }) {
    const subscription = await this.db(this.tableName)
      .where('admin_id', adminId)
      .andWhere('branch_id', branchId)
      .first();
    return subscription ? subscription.id : null;
  }

  async deleteByAdminAndBranchId(adminId, branchId) {
    return this.db(this.tableName)
      .where('admin_id', adminId)
      .andWhere('branch_id', branchId)
      .delete();
  }

  async getByBranchId(branchId) {
    return this.db(this.tableName).where('branch_id', branchId);
  }

  async save(input) {
    const id = await this.getPreviousSubscriptionId(input);
    if (id) {
      input.id = id;
    }
    return super.save(input);
  }
}

module.exports = AdminBranchSubscription;
