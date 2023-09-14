const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');

class GroupRole extends BaseModel {
  constructor(db, context) {
    super(db, 'group_roles', context);
    this.loaders = createLoaders(this);
  }

  getByGroupId(groupId) {
    return this.db(this.tableName)
      .join('roles', 'roles.id', 'group_roles.role_id')
      .where('group_id', groupId);
  }

  getByGroupIds(groupIds) {
    return this.db(this.tableName)
      .join('roles', 'roles.id', 'group_roles.role_id')
      .whereIn('group_id', groupIds);
  }

  deleteGroupRole(groupId, roleId) {
    return this.db(this.tableName)
      .where('group_id', groupId)
      .where('role_id', roleId)
      .del();
  }

  getByGroupAndRoleId(groupId, roleId) {
    return this.db(this.tableName)
      .where('group_id', groupId)
      .where('role_id', roleId)
      .first();
  }

  async validate() {
    const errors = [];

    return errors;
  }
}

module.exports = GroupRole;
