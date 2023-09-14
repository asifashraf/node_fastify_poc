const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const { removeGroupAdminError } = require('../root/enums');

class GroupAdmin extends BaseModel {
  constructor(db, context) {
    super(db, 'group_admins', context);
    this.loaders = createLoaders(this);
  }

  getByGroupAndAdminId(groupId, adminId) {
    return this.db(this.tableName)
      .where('group_id', groupId)
      .where('admin_id', adminId)
      .first();
  }

  getByAdminId(adminId) {
    return this.db(this.tableName)
      .select('groups.*')
      .join('groups', 'group_admins.group_id', 'groups.id')
      .where('admin_id', adminId);
  }

  deleteById(id) {
    return this.db(this.tableName)
      .where('id', id)
      .del();
  }

  deleteGroupAdmin(groupId, adminId) {
    return this.db(this.tableName)
      .where('group_id', groupId)
      .where('admin_id', adminId)
      .del();
  }

  async validateGroupAdminDelete(input) {
    const errors = [];
    if (input.groupId) {
      const group = await this.context.group.getById(input.groupId);
      if (!group) {
        errors.push(removeGroupAdminError.INVALID_GROUP);
      }
    } else {
      errors.push(removeGroupAdminError.INVALID_GROUP);
    }

    if (input.adminId) {
      const admin = await this.context.admin.getById(input.adminId);
      if (!admin) {
        errors.push(removeGroupAdminError.INVALID_ADMIN);
      }
    } else {
      errors.push(removeGroupAdminError.INVALID_ADMIN);
    }

    return errors;
  }

  async validate() {
    const errors = [];

    return errors;
  }
  async save(input) {
    const groupAdmin = await this.getByGroupAndAdminId(
      input.groupId,
      input.adminId
    );
    if (!groupAdmin) {
      const groupAdminId = await super.save({
        adminId: input.adminId,
        groupId: input.groupId,
      });
      return groupAdminId;
    }
    return groupAdmin.id;
  }
}

module.exports = GroupAdmin;
