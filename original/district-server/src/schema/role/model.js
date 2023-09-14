const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const { roleCreateError } = require('../root/enums');
const { pick, forEach } = require('lodash');

class Role extends BaseModel {
  constructor(db, context) {
    super(db, 'roles', context);
    this.loaders = createLoaders(this);
  }

  getByName(name) {
    return this.db(this.tableName)
      .where('name', name)
      .first();
  }

  async saveRole(input) {
    const role = pick(input, ['name', 'description']);
    const permissions = input.permissions ? input.permissions : [];
    if (input.id) {
      role.id = input.id;
    }
    const promisesAddDB = [];
    const promisesDelDB = [];

    const roleId = await super.save(role);

    if (permissions.length > 0) {
      forEach(permissions, async n => {
        if (n.deleted === true) {
          promisesDelDB.push(
            this.context.rolePermission.deleteRolePermission(
              roleId,
              n.permissionId
            )
          );
        } else {
          const permission = await this.context.rolePermission.getByRoleAndPermissionId(
            roleId,
            n.permissionId
          );
          if (!permission) {
            promisesAddDB.push(
              this.context.rolePermission.save({
                roleId,
                permissionId: n.permissionId,
              })
            );
          }
        }
      });
    }
    await Promise.all(promisesAddDB);
    await Promise.all(promisesDelDB);

    return roleId;
  }

  async validate(roleInput) {
    const errors = [];

    const roleNameCheck = await this.getByField('name', roleInput.name);

    if (roleNameCheck && roleNameCheck !== roleInput.id) {
      errors.push(roleCreateError.DUPLICATE_NAME);
    }

    return errors;
  }
}

module.exports = Role;
