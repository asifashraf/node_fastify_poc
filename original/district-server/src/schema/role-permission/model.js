const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');

class RolePermission extends BaseModel {
  constructor(db, context) {
    super(db, 'role_permissions', context);
    this.loaders = createLoaders(this);
  }

  getByRoleId(roleId) {
    return this.db(this.tableName)
      .select('permissions.*')
      .join('permissions', 'permissions.id', 'role_permissions.permission_id')
      .where('role_id', roleId)
      .orderBy('name', 'asc');
  }

  getByRoleIds(roleIds) {
    return this.db(this.tableName)
      .select('permissions.*')
      .join('permissions', 'permissions.id', 'role_permissions.permission_id')
      .whereIn('role_id', roleIds)
      .orderBy('name', 'asc');
  }

  deleteRolePermission(roleId, permissionId) {
    return this.db(this.tableName)
      .where('role_id', roleId)
      .where('permission_id', permissionId)
      .del();
  }

  getByRoleAndPermissionId(roleId, permissionId) {
    return this.db(this.tableName)
      .where('role_id', roleId)
      .where('permission_id', permissionId)
      .first();
  }

  async validate() {
    const errors = [];

    return errors;
  }
}

module.exports = RolePermission;
