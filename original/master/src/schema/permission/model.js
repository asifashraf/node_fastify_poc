const BaseModel = require('../../base-model');
const { createLoaders } = require('./loaders');
const { permissionCreateError } = require('../root/enums');
// const { map } = require('lodash');

class Permission extends BaseModel {
  constructor(db, context) {
    super(db, 'permissions', context);
    this.loaders = createLoaders(this);
  }

  getByName(name) {
    return this.db(this.tableName)
      .where('name', name)
      .first();
  }

  async getAdminPermissions({ authoId, email }) {
    const query = this.db('group_admins')
      .select(
        'permissions.name',
        'admins.id as adminId',
        'groups.name as groupName',
        'groups.id as groupId'
      )
      .joinRaw(
        `inner join groups on
        group_admins.group_id = groups.id or
        groups.id = (select group_id from nested_groups where nested_group_id = group_admins.group_id)`
      )
      .innerJoin('group_roles', 'groups.id', 'group_roles.group_id')
      .innerJoin(
        'role_permissions',
        'group_roles.role_id',
        'role_permissions.role_id'
      )
      .innerJoin(
        'permissions',
        'role_permissions.permission_id',
        'permissions.id'
      )
      .innerJoin('admins', 'group_admins.admin_id', 'admins.id');

    if (authoId) {
      query.where('admins.autho_id', authoId);
    } else if (email) {
      query.whereRaw(`lower(admins.email) = '${email.toLowerCase()}' `);
    }
    // console.log(query.toString());
    // const permissions = map(await query, n => n.name);

    return query;
  }

  async validate(permissionInput) {
    const errors = [];

    const permissionNameCheck = await this.getByField(
      'name',
      permissionInput.name
    );

    if (permissionNameCheck && permissionNameCheck !== permissionInput.id) {
      errors.push(permissionCreateError.DUPLICATE_NAME);
    }

    return errors;
  }
}

module.exports = Permission;
